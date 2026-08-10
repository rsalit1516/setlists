import prisma from '@/lib/db'
import type { Genre, GenreWithSongCount } from '@/lib/types'

export async function getGenres(): Promise<Genre[]> {
  return prisma.genre.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }) as Promise<Genre[]>
}

export async function getGenre(id: string): Promise<Genre | null> {
  return prisma.genre.findUnique({ where: { id } }) as Promise<Genre | null>
}

// Song counts are fetched alongside the list (rather than on demand) so the
// Genres directory page can warn "used by N songs" before the user commits
// to deactivating one — see #69.
export async function getGenresWithSongCounts(): Promise<GenreWithSongCount[]> {
  const genres = await prisma.genre.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { songs: true } } },
  })
  return genres.map(({ _count, ...genre }) => ({ ...genre, songCount: _count.songs }))
}
