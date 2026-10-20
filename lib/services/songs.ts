import prisma from '@/lib/db'
import { resolveSong } from '@/lib/resolve-song'
import type { Song, SongStatus } from '@/lib/types'

type BandSongWithSong = Parameters<typeof resolveSong>[0] & { song: Parameters<typeof resolveSong>[1] }

// A band's song catalog: its active BandSongs whose Song is also active, resolved to the Song the UI
// knows (id = BandSong id). Genres are opt-in (default false) — lib/services/stats.ts calls this for
// READY/IN_PROGRESS songs and only ever reads id/title/artist/key/updatedAt, so joining the genres
// relation there would be pure overhead. UI call sites that render or filter by genre (Songs list,
// setlist song picker) pass true.
export async function getSongs(
  bandId: string,
  status?: SongStatus,
  genreIds?: string[],
  includeGenres = false
): Promise<Song[]> {
  const rows = (await prisma.bandSong.findMany({
    where: {
      bandId,
      isActive: true,
      ...(status ? { status } : {}),
      song: {
        isActive: true,
        ...(genreIds?.length ? { genres: { some: { id: { in: genreIds } } } } : {}),
      },
    },
    include: { song: includeGenres ? { include: { genres: true } } : true },
    orderBy: { song: { title: 'asc' } },
  })) as unknown as BandSongWithSong[]

  return rows.map(({ song, ...bandSong }) => resolveSong(bandSong, song))
}

export async function getSong(bandId: string, id: string): Promise<Song | null> {
  const row = (await prisma.bandSong.findFirst({
    where: { id, bandId },
    include: { song: { include: { genres: true } } },
  })) as unknown as BandSongWithSong | null
  if (!row) return null

  const { song, ...bandSong } = row
  return resolveSong(bandSong, song)
}
