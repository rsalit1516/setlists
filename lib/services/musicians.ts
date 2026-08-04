import prisma from '@/lib/db'
import type { Musician } from '@/lib/types'

export async function getMusicians(): Promise<Musician[]> {
  return prisma.musician.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }) as Promise<Musician[]>
}

export async function getMusician(id: string): Promise<Musician | null> {
  return prisma.musician.findUnique({ where: { id } }) as Promise<Musician | null>
}
