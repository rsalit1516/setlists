import prisma from '@/lib/db'
import { resolveSong } from '@/lib/resolve-song'
import { scoreMatch, searchTokens } from '@/lib/song-match'
import type { Song, SongStatus } from '@/lib/types'

type BandSongWithSong = Parameters<typeof resolveSong>[0] & { song: Parameters<typeof resolveSong>[1] }

// A band's song catalog: its active BandSongs whose Song is also active, resolved to the Song the UI
// knows (id = BandSong id). Genres are opt-in (default false) — lib/services/stats.ts calls this for
// READY/IN_PROGRESS songs and only ever reads id/title/artist/key/updatedAt, so joining the genres
// relation there would be pure overhead. UI call sites that render or filter by genre (Songs list,
// setlist song picker) pass true.
export async function getSongs(
  bandId: string,
  status?: SongStatus,
  genreIds?: string[],
  includeGenres = false
): Promise<Song[]> {
  const rows = (await prisma.bandSong.findMany({
    where: {
      bandId,
      isActive: true,
      ...(status ? { status } : {}),
      song: {
        isActive: true,
        ...(genreIds?.length ? { genres: { some: { id: { in: genreIds } } } } : {}),
      },
    },
    include: { song: includeGenres ? { include: { genres: true } } : true },
    orderBy: { song: { title: 'asc' } },
  })) as unknown as BandSongWithSong[]

  return rows.map(({ song, ...bandSong }) => resolveSong(bandSong, song))
}

export async function getSong(bandId: string, id: string): Promise<Song | null> {
  const row = (await prisma.bandSong.findFirst({
    where: { id, bandId },
    include: { song: { include: { genres: true } } },
  })) as unknown as BandSongWithSong | null
  if (!row) return null

  const { song, ...bandSong } = row
  return resolveSong(bandSong, song)
}

export type CatalogMatch = {
  songId: string
  title: string
  artist: string | null
  // true: shared by every band; false: this band's own private song
  isMaster: boolean
  // set when the song is already in this band's catalog (and not removed from it)
  bandSongId: string | null
  // the band once had it and removed it, so adding it again brings its old status back
  removed: boolean
  score: number
}

const MIN_SCORE = 0.45
const MAX_RESULTS = 15

// The "did you mean" lookup behind Add Song: songs this band could add or already has. That is the
// master catalog plus the band's own private songs, and never another band's private songs. Candidates
// come from the database by their longest words; ranking is done here with the normalizing matcher so
// "dont stop believin" finds "Don't Stop Believin'".
export async function searchCatalog(
  bandId: string,
  query: { title: string; artist?: string | null }
): Promise<CatalogMatch[]> {
  const words = searchTokens(query.title)
  if (words.length === 0) return []

  const rows = await prisma.song.findMany({
    where: {
      isActive: true,
      OR: [{ ownerBandId: null }, { ownerBandId: bandId }],
      AND: [{ OR: words.map((word) => ({ title: { contains: word, mode: 'insensitive' as const } })) }],
    },
    select: {
      id: true,
      title: true,
      artist: true,
      ownerBandId: true,
      bandSongs: { where: { bandId }, select: { id: true, isActive: true } },
    },
    take: 60,
  })

  const asText = { title: query.title, artist: query.artist ?? null }
  return rows
    .map((row) => {
      const entry = row.bandSongs[0]
      return {
        songId: row.id,
        title: row.title,
        artist: row.artist,
        isMaster: row.ownerBandId === null,
        bandSongId: entry?.isActive ? entry.id : null,
        removed: !!entry && !entry.isActive,
        score: scoreMatch(asText, row),
      }
    })
    .filter((match) => match.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, MAX_RESULTS)
}
