import prisma from '@/lib/db'
import type { Song } from '@/lib/types'

export async function getSongs(bandId: string): Promise<Song[]> {
  return prisma.song.findMany({
    where: { bandId },
    orderBy: { title: 'asc' },
  }) as Promise<Song[]>
}

export async function getSong(id: string, bandId: string): Promise<Song | null> {
  return prisma.song.findFirst({ where: { id, bandId } }) as Promise<Song | null>
}
