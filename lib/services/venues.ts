import prisma from '@/lib/db'
import type { Venue } from '@/lib/types'

export async function getVenues(bandId: string): Promise<Venue[]> {
  return prisma.venue.findMany({
    where: { bandId },
    orderBy: { name: 'asc' },
  }) as Promise<Venue[]>
}

export async function getVenue(id: string, bandId: string): Promise<Venue | null> {
  return prisma.venue.findFirst({ where: { id, bandId } }) as Promise<Venue | null>
}
