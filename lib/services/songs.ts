import prisma from '@/lib/db'
import type { Song, SongStatus } from '@/lib/types'

export async function getSongs(status?: SongStatus): Promise<Song[]> {
  return prisma.song.findMany({
    where: status ? { status } : undefined,
    orderBy: { title: 'asc' },
  }) as Promise<Song[]>
}

export async function getSongStatusCounts(): Promise<Record<string, number>> {
  const rows = await (prisma as any).song.groupBy({
    by: ['status'],
    _count: { id: true },
  })
  return Object.fromEntries(rows.map((r: any) => [r.status, r._count.id]))
}

export async function getSong(id: string): Promise<Song | null> {
  return prisma.song.findUnique({ where: { id } }) as Promise<Song | null>
}
