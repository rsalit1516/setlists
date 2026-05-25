import prisma from '@/lib/db'
import type { SetlistSummary, SetlistWithItems } from '@/lib/types'

export async function getSetlists(bandId: string): Promise<SetlistSummary[]> {
  return prisma.setlist.findMany({
    where: { bandId },
    orderBy: [{ gig: { date: 'desc' } }, { createdAt: 'desc' }],
    include: {
      gig: { include: { venue: true } },
      _count: { select: { items: true } },
    },
  }) as Promise<SetlistSummary[]>
}

export async function getSetlist(id: string, bandId: string): Promise<SetlistWithItems | null> {
  return prisma.setlist.findFirst({
    where: { id, bandId },
    include: {
      items: {
        include: { song: true },
        orderBy: [{ setNumber: 'asc' }, { order: 'asc' }],
      },
      gig: { include: { venue: true } },
    },
  }) as Promise<SetlistWithItems | null>
}
