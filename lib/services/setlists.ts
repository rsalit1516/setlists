import prisma from '@/lib/db'
import { resolveSong } from '@/lib/resolve-song'
import type { SetlistSummary, SetlistWithItems } from '@/lib/types'

// Every setlist belongs to at most one gig (strict 1:1, restored in #41 —
// see #34/#37 for the reuse-by-reference model this replaced). Used by the
// gig-creation form to offer past setlists as a copy-from source.
export async function getSetlists(bandId: string): Promise<SetlistSummary[]> {
  return prisma.setlist.findMany({
    where: { bandId, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      gig: { include: { venue: true } },
      _count: { select: { items: { where: { isActive: true } } } },
    },
  }) as Promise<SetlistSummary[]>
}

// Each item's `song` is the band's resolved view and its `songId` is the BandSong id, so callers keep
// matching items to the song list (also BandSong ids) the same way they always did.
export async function getSetlist(bandId: string, id: string): Promise<SetlistWithItems | null> {
  const row = await prisma.setlist.findFirst({
    where: { id, bandId },
    include: {
      items: {
        where: { isActive: true },
        include: { bandSong: { include: { song: true } } },
        orderBy: [{ setNumber: 'asc' }, { order: 'asc' }],
      },
      gig: { include: { venue: true } },
    },
  })
  if (!row) return null

  return {
    ...row,
    items: row.items.map(({ bandSong, ...item }) => ({
      ...item,
      songId: bandSong.id,
      song: resolveSong(bandSong, bandSong.song),
    })),
  } as SetlistWithItems
}
