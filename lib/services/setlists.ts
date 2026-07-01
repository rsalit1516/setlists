import prisma from '@/lib/db'
import type { SetlistSummary, SetlistWithItems } from '@/lib/types'

export async function getSetlists(): Promise<SetlistSummary[]> {
  return prisma.setlist.findMany({
    where: { isActive: true },
    orderBy: [{ gig: { date: 'desc' } }, { createdAt: 'desc' }],
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
