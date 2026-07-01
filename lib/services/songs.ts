import prisma from '@/lib/db'
import type { Song } from '@/lib/types'

export async function getSongs(): Promise<Song[]> {
  return prisma.song.findMany({ where: { isActive: true }, orderBy: { title: 'asc' } }) as Promise<Song[]>
}

export async function getSong(id: string): Promise<Song | null> {
  return prisma.song.findUnique({ where: { id } }) as Promise<Song | null>
}
