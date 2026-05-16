import prisma from '@/lib/db'
import type { SetlistSummary, SetlistWithItems } from '@/lib/types'

export async function getSetlists(): Promise<SetlistSummary[]> {
  return prisma.setlist.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      gig: { include: { venue: true } },
      _count: { select: { items: true } },
    },
  }) as Promise<SetlistSummary[]>
}

export async function getSetlist(id: string): Promise<SetlistWithItems | null> {
  return prisma.setlist.findUnique({
    where: { id },
    include: {
      items: {
        include: { song: true },
        orderBy: [{ setNumber: 'asc' }, { order: 'asc' }],
      },
      gig: { include: { venue: true } },
    },
  }) as Promise<SetlistWithItems | null>
}
