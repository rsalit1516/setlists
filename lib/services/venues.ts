import prisma from '@/lib/db'
import type { Venue } from '@/lib/types'

export async function getVenues(): Promise<Venue[]> {
  return prisma.venue.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }) as Promise<Venue[]>
}

export async function getVenue(id: string): Promise<Venue | null> {
  return prisma.venue.findUnique({ where: { id } }) as Promise<Venue | null>
}
