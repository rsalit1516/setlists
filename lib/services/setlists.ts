import prisma from '@/lib/db'
import type { SetlistSummary, SetlistWithItems } from '@/lib/types'

// Every setlist belongs to at most one gig (strict 1:1, restored in #41 —
// see #34/#37 for the reuse-by-reference model this replaced). Used by the
// gig-creation form to offer past setlists as a copy-from source.
export async function getSetlists(): Promise<SetlistSummary[]> {
  return prisma.setlist.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      gig: { include: { venue: true } },
      _count: { select: { items: { where: { isActive: true } } } },
    },
  }) as Promise<SetlistSummary[]>
}

export async function getSetlist(id: string): Promise<SetlistWithItems | null> {
  return prisma.setlist.findUnique({
    where: { id },
    include: {
      items: {
        where: { isActive: true },
        include: { song: true },
        orderBy: [{ setNumber: 'asc' }, { order: 'asc' }],
      },
      gig: { include: { venue: true } },
    },
  }) as Promise<SetlistWithItems | null>
}
