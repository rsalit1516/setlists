import prisma from '@/lib/db'
import type { SetlistSummary, SetlistWithItems } from '@/lib/types'

export async function getSetlists(): Promise<SetlistSummary[]> {
  // A setlist can now back multiple gigs (or none), so it can no longer be
  // ordered by "its" gig date — order by creation instead and let callers
  // fall back to each setlist's own gigs array for date info.
  return prisma.setlist.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      gigs: { where: { isActive: true }, orderBy: { date: 'desc' }, include: { venue: true } },
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
      gigs: { where: { isActive: true }, orderBy: { date: 'desc' }, include: { venue: true } },
    },
  }) as Promise<SetlistWithItems | null>
}
