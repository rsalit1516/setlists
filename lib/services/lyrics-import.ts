import prisma from '@/lib/db'
import { sanitizeLyricsHtml } from '@/lib/services/sanitize-lyrics'

const LRCLIB_SEARCH_URL = 'https://lrclib.net/api/search'
const LRCLIB_TRACK_URL = 'https://lrclib.net/api/get'
const USER_AGENT = 'setlists-app (https://github.com/rsalit1516/setlists)'
const DURATION_TOLERANCE_SECONDS = 10

type LrclibTrack = {
  id: number
  trackName: string
  artistName: string
  duration: number | null
  instrumental: boolean
  plainLyrics: string | null
}

export type LyricsLookup = { title: string; artist: string | null; durationSeconds: number | null }

export type FetchedLyrics = { html: string; sourceUrl: string }

export type ImportOutcome = 'imported' | 'no-match' | 'error'

export type ImportSummary = {
  dryRun: boolean
  imported: number
  noMatch: number
  errors: number
  results: { id: string; title: string; artist: string | null; outcome: ImportOutcome }[]
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function artistsMatch(wanted: string, found: string): boolean {
  const candidates = wanted
    .split('/')
    .map((a) => normalize(a).replace(/^the /, ''))
    .filter(Boolean)
  const target = normalize(found).replace(/^the /, '')
  return candidates.some((c) => target.includes(c) || c.includes(target))
}

// A title like "Brick > Shakedown" is a medley of two songs; a lyrics database
// has no single entry for it, so don't guess.
function isMedley(title: string): boolean {
  return title.includes('>')
}

export function pickBestMatch(lookup: LyricsLookup, candidates: LrclibTrack[]): LrclibTrack | null {
  if (isMedley(lookup.title)) return null

  const wantedTitle = normalize(lookup.title)
  const matches = candidates.filter((c) => {
    if (c.instrumental || !c.plainLyrics?.trim()) return false
    if (normalize(c.trackName) !== wantedTitle) return false
    if (lookup.artist && !artistsMatch(lookup.artist, c.artistName)) return false
    if (lookup.durationSeconds && c.duration) {
      return Math.abs(c.duration - lookup.durationSeconds) <= DURATION_TOLERANCE_SECONDS
    }
    return true
  })

  if (!matches.length) return null
  if (!lookup.durationSeconds) return matches[0]

  const wanted = lookup.durationSeconds
  return matches.reduce((best, c) =>
    Math.abs((c.duration ?? Infinity) - wanted) < Math.abs((best.duration ?? Infinity) - wanted) ? c : best
  )
}

export async function fetchLyrics(
  lookup: LyricsLookup,
  fetchImpl: typeof fetch = fetch
): Promise<FetchedLyrics | null> {
  if (isMedley(lookup.title)) return null

  const params = new URLSearchParams({ track_name: lookup.title })
  if (lookup.artist) params.set('artist_name', lookup.artist.split('/')[0].trim())

  const res = await fetchImpl(`${LRCLIB_SEARCH_URL}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!res.ok) throw new Error(`LRCLIB search failed: ${res.status}`)

  const match = pickBestMatch(lookup, (await res.json()) as LrclibTrack[])
  if (!match?.plainLyrics) return null

  const html = sanitizeLyricsHtml(match.plainLyrics)
  if (!html) return null

  return { html, sourceUrl: `${LRCLIB_TRACK_URL}/${match.id}` }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Never overwrites: only songs with empty lyrics are considered, and the write
// is guarded on `lyrics: null` so a band member's edit made mid-run wins.
export async function importMissingLyrics(
  options: { dryRun?: boolean; limit?: number; delayMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<ImportSummary> {
  const { dryRun = false, limit, delayMs = 1000, fetchImpl = fetch } = options

  const songs = await prisma.song.findMany({
    where: { isActive: true, lyrics: null },
    select: { id: true, title: true, artist: true, durationSeconds: true },
    orderBy: { title: 'asc' },
    ...(limit ? { take: limit } : {}),
  })

  const summary: ImportSummary = { dryRun, imported: 0, noMatch: 0, errors: 0, results: [] }

  for (const [index, song] of songs.entries()) {
    if (index > 0 && delayMs > 0) await sleep(delayMs)

    let outcome: ImportOutcome
    try {
      const found = await fetchLyrics(song, fetchImpl)
      if (!found) {
        outcome = 'no-match'
      } else {
        if (!dryRun) {
          await prisma.song.updateMany({
            where: { id: song.id, lyrics: null },
            data: {
              lyrics: found.html,
              lyricsSource: 'IMPORTED',
              lyricsSourceUrl: found.sourceUrl,
              lyricsImportedAt: new Date(),
              lyricsUpdatedAt: new Date(),
            },
          })
        }
        outcome = 'imported'
      }
    } catch {
      outcome = 'error'
    }

    if (outcome === 'imported') summary.imported++
    else if (outcome === 'no-match') summary.noMatch++
    else summary.errors++
    summary.results.push({ id: song.id, title: song.title, artist: song.artist, outcome })
  }

  return summary
}

export async function importLyricsForSong(
  id: string,
  fetchImpl: typeof fetch = fetch
): Promise<ImportOutcome> {
  const song = await prisma.song.findUnique({
    where: { id },
    select: { id: true, title: true, artist: true, durationSeconds: true, lyrics: true },
  })
  if (!song || song.lyrics) return 'no-match'

  const found = await fetchLyrics(song, fetchImpl)
  if (!found) return 'no-match'

  const { count } = await prisma.song.updateMany({
    where: { id, lyrics: null },
    data: {
      lyrics: found.html,
      lyricsSource: 'IMPORTED',
      lyricsSourceUrl: found.sourceUrl,
      lyricsImportedAt: new Date(),
      lyricsUpdatedAt: new Date(),
    },
  })
  return count ? 'imported' : 'no-match'
}
