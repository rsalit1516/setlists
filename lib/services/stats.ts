import prisma from '@/lib/db'
import { getSongs } from '@/lib/services/songs'
import type {
  MostPlayedSong,
  ReadySongNeverPlayed,
  StaleReadySong,
  StaleInProgressSong,
} from '@/lib/types'

export const DEFAULT_STALE_GIG_WINDOW = 10
export const DEFAULT_STALE_DAYS_THRESHOLD = 60
const MS_PER_DAY = 24 * 60 * 60 * 1000

// Shared join: a play only counts if the SetlistItem is active, was actually
// played, and belongs to a Setlist attached to an active Gig — a Setlist
// with no Gig (e.g. a draft) never counts as a performance. Both
// getMostPlayedSongs and getReadySongsNeverPlayed build on this same
// per-song count instead of re-deriving the join twice.
async function getPlayCountsBySongId(): Promise<Map<string, number>> {
  const rows = await prisma.setlistItem.findMany({
    where: {
      isActive: true,
      wasPlayed: true,
      setlist: { gig: { isActive: true } },
    },
    select: { songId: true },
  })

  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.songId, (counts.get(row.songId) ?? 0) + 1)
  }
  return counts
}

// Song is not filtered by isActive here — a play count is a historical fact
// even for a since-deactivated song.
export async function getMostPlayedSongs(limit = 10): Promise<MostPlayedSong[]> {
  const counts = await getPlayCountsBySongId()
  if (counts.size === 0) return []

  const songs = await prisma.song.findMany({
    where: { id: { in: Array.from(counts.keys()) } },
    select: { id: true, title: true, artist: true },
  })

  return songs
    .map((s) => ({ songId: s.id, title: s.title, artist: s.artist, playCount: counts.get(s.id)! }))
    .sort((a, b) => b.playCount - a.playCount || a.title.localeCompare(b.title))
    .slice(0, limit)
}

export async function getReadySongsNeverPlayed(): Promise<ReadySongNeverPlayed[]> {
  const [counts, readySongs] = await Promise.all([getPlayCountsBySongId(), getSongs('READY')])

  // getSongs orders by title asc already — filtering preserves that order.
  return readySongs
    .filter((s) => !counts.has(s.id))
    .map((s) => ({ songId: s.id, title: s.title, artist: s.artist, key: s.key }))
}

// Distinct from getPlayCountsBySongId: that helper counts plays at ANY active
// gig, all-time, with no ordering. This one needs the opposite shape — which
// active PAST gig (date <= now) each song was most recently played at, so we
// can tell "played, but not within the last N gigs" apart from "never
// played." Built gig-first (not setlistItem-first) so iteration order over
// gigs (most-recent-first) doubles as each song's "gigs since last played."
async function getGigsSinceLastPlayedBySongId(): Promise<Map<string, number>> {
  const gigs = await prisma.gig.findMany({
    where: { isActive: true, date: { lte: new Date() } },
    orderBy: { date: 'desc' },
    select: {
      setlist: {
        select: {
          items: {
            where: { isActive: true, wasPlayed: true },
            select: { songId: true },
          },
        },
      },
    },
  })

  const gigsSinceLastPlayed = new Map<string, number>()
  gigs.forEach((gig, gigIndex) => {
    for (const item of gig.setlist.items) {
      if (!gigsSinceLastPlayed.has(item.songId)) {
        gigsSinceLastPlayed.set(item.songId, gigIndex)
      }
    }
  })
  return gigsSinceLastPlayed
}

// Sorted by gigs since last played descending; never-played songs are
// treated as infinitely stale and sort first (gigsSinceLastPlayed: null),
// ahead of songs merely last played before the window.
export async function getStaleReadySongs(
  gigWindow = DEFAULT_STALE_GIG_WINDOW
): Promise<StaleReadySong[]> {
  const [gigsSinceLastPlayed, readySongs] = await Promise.all([
    getGigsSinceLastPlayedBySongId(),
    getSongs('READY'),
  ])

  return readySongs
    .map((s) => ({
      songId: s.id,
      title: s.title,
      artist: s.artist,
      key: s.key,
      gigsSinceLastPlayed: gigsSinceLastPlayed.get(s.id) ?? null,
    }))
    .filter((s) => s.gigsSinceLastPlayed === null || s.gigsSinceLastPlayed >= gigWindow)
    .sort((a, b) => {
      if (a.gigsSinceLastPlayed === null || b.gigsSinceLastPlayed === null) {
        if (a.gigsSinceLastPlayed === b.gigsSinceLastPlayed) return a.title.localeCompare(b.title)
        return a.gigsSinceLastPlayed === null ? -1 : 1
      }
      return b.gigsSinceLastPlayed - a.gigsSinceLastPlayed || a.title.localeCompare(b.title)
    })
}

// `updatedAt` bumps on any field edit, not specifically a status change — this
// is a proxy for "untouched," not a precise "time spent In Progress." No
// dedicated statusChangedAt field, by design (decided with the user).
// `now` is injectable so tests don't depend on the real clock; callers omit it.
export async function getStaleInProgressSongs(
  daysThreshold = DEFAULT_STALE_DAYS_THRESHOLD,
  now: Date = new Date()
): Promise<StaleInProgressSong[]> {
  const cutoff = new Date(now.getTime() - daysThreshold * MS_PER_DAY)
  const songs = await getSongs('IN_PROGRESS')

  return songs
    .filter((s) => s.updatedAt <= cutoff)
    .map((s) => ({
      songId: s.id,
      title: s.title,
      artist: s.artist,
      daysSinceUpdate: Math.floor((now.getTime() - s.updatedAt.getTime()) / MS_PER_DAY),
    }))
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
}
