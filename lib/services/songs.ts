import prisma from '@/lib/db'
import type { Song, SongStatus } from '@/lib/types'

export async function getSongs(status?: SongStatus): Promise<Song[]> {
  return prisma.song.findMany({
    where: { isActive: true, ...(status ? { status } : {}) },
    orderBy: { title: 'asc' },
  }) as Promise<Song[]>
}

export async function getSong(id: string): Promise<Song | null> {
  return prisma.song.findUnique({ where: { id } }) as Promise<Song | null>
}
