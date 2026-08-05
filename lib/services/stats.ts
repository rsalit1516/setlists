import prisma from '@/lib/db'
import type { MostPlayedSong } from '@/lib/types'

type PlayedSetlistItemRow = {
  songId: string
  song: { title: string; artist: string | null }
}

// Song is not filtered by isActive here — a play count is a historical fact
// even for a since-deactivated song. Matches the join chain from the issue
// spec (Song → SetlistItem → Setlist → Gig), which stops at Gig.isActive.
export async function getMostPlayedSongs(limit = 10): Promise<MostPlayedSong[]> {
  const rows: PlayedSetlistItemRow[] = await prisma.setlistItem.findMany({
    where: {
      isActive: true,
      wasPlayed: true,
      setlist: { gig: { isActive: true } },
    },
    select: {
      songId: true,
      song: { select: { title: true, artist: true } },
    },
  })

  const counts = new Map<string, { title: string; artist: string | null; playCount: number }>()
  for (const row of rows) {
    const existing = counts.get(row.songId)
    if (existing) {
      existing.playCount += 1
    } else {
      counts.set(row.songId, { title: row.song.title, artist: row.song.artist, playCount: 1 })
    }
  }

  return Array.from(counts.entries())
    .map(([songId, v]) => ({ songId, ...v }))
    .sort((a, b) => b.playCount - a.playCount || a.title.localeCompare(b.title))
    .slice(0, limit)
}
