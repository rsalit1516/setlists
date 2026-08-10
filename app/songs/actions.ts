'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { uploadChartFile, deleteChartFile } from '@/lib/services/azure-blob'
import { sanitizeLyricsHtml } from '@/lib/services/sanitize-lyrics'
import { SONGS_GENRES_COOKIE, parseGenreFilterValue, toggleGenreId } from '@/lib/songs-genre-filter'

export type SongActionState = { error: string } | null

function parseDuration(value: string | null): number | null {
  if (!value || value.trim() === '') return null
  if (value.includes(':')) {
    const [mins, secs] = value.split(':').map(Number)
    return (mins || 0) * 60 + (secs || 0)
  }
  const n = parseInt(value)
  return isNaN(n) ? null : n
}

function parseSongFormData(formData: FormData) {
  return {
    title: (formData.get('title') as string).trim(),
    artist: (formData.get('artist') as string).trim() || null,
    key: (formData.get('key') as string).trim() || null,
    singer: (formData.get('singer') as string).trim() || null,
    status: (formData.get('status') as SongStatus) ?? 'WISH',
    keyboardRequired: formData.get('keyboardRequired') === 'true',
    durationSeconds: parseDuration(formData.get('duration') as string | null),
    bpm: formData.get('bpm') ? parseInt(formData.get('bpm') as string) || null : null,
    lyrics: sanitizeLyricsHtml(formData.get('lyrics') as string | null),
  }
}

function parseGenreIds(formData: FormData): string[] {
  return [...new Set(formData.getAll('genreIds').map(String))]
}

async function resolveChartFile(
  formData: FormData,
  songId: string,
  currentChartFileUrl: string | null
): Promise<{ chartFileUrl: string | null; chartFileType: string | null; chartFileName: string | null } | null> {
  const file = formData.get('chartFile') as File | null
  const shouldRemove = formData.get('removeChartFile') === 'true'

  if (file && file.size > 0) {
    if (currentChartFileUrl) await deleteChartFile(currentChartFileUrl).catch(() => {})
    const { url, type, name } = await uploadChartFile(songId, file)
    return { chartFileUrl: url, chartFileType: type, chartFileName: name }
  }

  if (shouldRemove && currentChartFileUrl) {
    await deleteChartFile(currentChartFileUrl).catch(() => {})
    return { chartFileUrl: null, chartFileType: null, chartFileName: null }
  }

  return null
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export async function createSong(
  _state: SongActionState,
  formData: FormData
): Promise<SongActionState> {
  const data = parseSongFormData(formData)
  if (!data.title) return { error: 'Title is required.' }
  const genreIds = parseGenreIds(formData)

  let song
  try {
    song = await prisma.song.create({
      data: { ...data, genres: { connect: genreIds.map((genreId) => ({ id: genreId })) } },
    })
  } catch {
    return { error: 'Failed to create song.' }
  }

  try {
    const chartUpdate = await resolveChartFile(formData, song.id, null)
    if (chartUpdate) {
      await prisma.song.update({ where: { id: song.id }, data: chartUpdate })
    }
  } catch (err) {
    await prisma.song.delete({ where: { id: song.id } }).catch(() => {})
    return { error: errorMessage(err, 'Failed to upload chart file.') }
  }

  revalidatePath('/songs')
  redirect('/songs')
}

export async function updateSong(
  _state: SongActionState,
  formData: FormData
): Promise<SongActionState> {
  const id = formData.get('id') as string
  const data = parseSongFormData(formData)
  if (!data.title) return { error: 'Title is required.' }
  const genreIds = parseGenreIds(formData)

  let chartUpdate
  try {
    const current = await prisma.song.findUnique({ where: { id }, select: { chartFileUrl: true } })
    chartUpdate = await resolveChartFile(formData, id, current?.chartFileUrl ?? null)
  } catch (err) {
    return { error: errorMessage(err, 'Failed to upload chart file.') }
  }

  try {
    await prisma.song.update({
      where: { id },
      data: { ...data, ...chartUpdate, genres: { set: genreIds.map((genreId) => ({ id: genreId })) } },
    })
  } catch {
    return { error: 'Failed to update song.' }
  }

  revalidatePath('/songs')
  redirect('/songs')
}

export async function deleteSong(id: string): Promise<void> {
  await prisma.song.update({ where: { id }, data: { isActive: false } })
  revalidatePath('/songs')
}

// Server Action, not a Link-to-GET-route-handler (the previous app/api/genre-filter/route.ts
// approach) — a GET reachable via <Link href> gets invoked by Next.js's automatic viewport
// prefetching (see node_modules/next/dist/docs/.../prefetching.md, "Triggering unwanted
// side-effects during prefetching"), which was silently flipping the genre-filter cookie in
// the background since every pill sits in the viewport at once. A Server Action is a POST,
// never prefetched. See #72.
export async function toggleSongsGenreFilter(genreId: string): Promise<void> {
  const cookieStore = await cookies()
  const current = parseGenreFilterValue(cookieStore.get(SONGS_GENRES_COOKIE)?.value)
  const next = toggleGenreId(current, genreId)

  const validGenres = next.length
    ? await prisma.genre.findMany({ where: { id: { in: next }, isActive: true }, select: { id: true } })
    : []

  cookieStore.set(SONGS_GENRES_COOKIE, validGenres.map((g) => g.id).join(','), {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })
  revalidatePath('/songs')
}
