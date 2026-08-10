import prisma from '@/lib/db'
import type { Song, SongStatus } from '@/lib/types'

// Genres are opt-in (default false) — lib/services/stats.ts calls this for
// READY/IN_PROGRESS songs and only ever reads id/title/artist/key/updatedAt,
// so joining the genres relation there would be pure overhead. UI call sites
// that render or filter by genre (Songs list, setlist song picker) pass true.
export async function getSongs(
  status?: SongStatus,
  genreIds?: string[],
  includeGenres = false
): Promise<Song[]> {
  const songs = await prisma.song.findMany({
    where: {
      isActive: true,
      ...(status ? { status } : {}),
      ...(genreIds?.length ? { genres: { some: { id: { in: genreIds } } } } : {}),
    },
    ...(includeGenres ? { include: { genres: true } } : {}),
    orderBy: { title: 'asc' },
  })

  return (includeGenres ? songs : songs.map((song) => ({ ...song, genres: [] }))) as Song[]
}

export async function getSong(id: string): Promise<Song | null> {
  return prisma.song.findUnique({ where: { id }, include: { genres: true } }) as Promise<Song | null>
}
