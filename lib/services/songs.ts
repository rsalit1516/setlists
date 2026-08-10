import prisma from '@/lib/db'
import type { Song, SongStatus } from '@/lib/types'

export async function getSongs(status?: SongStatus, genreIds?: string[]): Promise<Song[]> {
  return prisma.song.findMany({
    where: {
      isActive: true,
      ...(status ? { status } : {}),
      ...(genreIds?.length ? { genres: { some: { id: { in: genreIds } } } } : {}),
    },
    include: { genres: true },
    orderBy: { title: 'asc' },
  }) as Promise<Song[]>
}

export async function getSong(id: string): Promise<Song | null> {
  return prisma.song.findUnique({ where: { id }, include: { genres: true } }) as Promise<Song | null>
}
