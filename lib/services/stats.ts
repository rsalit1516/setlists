import prisma from '@/lib/db'
import { getSongs } from '@/lib/services/songs'
import type { MostPlayedSong, ReadySongNeverPlayed } from '@/lib/types'

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
