import prisma from '@/lib/db'
import type { Musician } from '@/lib/types'

export async function getMusicians(bandId: string): Promise<Musician[]> {
  return prisma.musician.findMany({ where: { bandId, isActive: true }, orderBy: { name: 'asc' } }) as Promise<Musician[]>
}

export async function getMusician(bandId: string, id: string): Promise<Musician | null> {
  return prisma.musician.findFirst({ where: { id, bandId } }) as Promise<Musician | null>
}
