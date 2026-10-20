'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { uploadChartFile, deleteChartFile } from '@/lib/services/azure-blob'
import { sanitizeLyricsHtml } from '@/lib/services/sanitize-lyrics'
import { importLyricsForSong, type ImportOutcome } from '@/lib/services/lyrics-import'
import { SONGS_GENRES_COOKIE, parseGenreFilterValue, toggleGenreId } from '@/lib/songs-genre-filter'
import { parseBpm } from '@/lib/bpm'
import { canEditSong, getBandContext } from '@/lib/band'
import { assertOwned, NotFoundError } from '@/lib/ownership'
import { searchCatalog } from '@/lib/services/songs'
import { isLikelyDuplicate } from '@/lib/song-match'
import type { SongStatus } from '@/lib/types'

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

// `generic` lands on the shared Song row; `band` on this band's BandSong.
function parseSongFormData(formData: FormData) {
  const bpm = parseBpm(formData.get('bpm') as string | null)
  if ('error' in bpm) return bpm

  return {
    generic: {
      title: (formData.get('title') as string).trim(),
      artist: (formData.get('artist') as string).trim() || null,
      key: (formData.get('key') as string).trim() || null,
      durationSeconds: parseDuration(formData.get('duration') as string | null),
      bpm: bpm.bpm,
      lyrics: sanitizeLyricsHtml(formData.get('lyrics') as string | null),
    },
    band: {
      singer: (formData.get('singer') as string).trim() || null,
      status: (formData.get('status') as SongStatus) ?? 'WISH',
      keyboardRequired: formData.get('keyboardRequired') === 'true',
    },
  }
}

// The editor re-serializes a blank line as <p></p> where the importer stores
// <p><br></p>; without this an untouched imported lyric would flip to MANUAL
// on any unrelated save.
function lyricsChanged(previous: string | null, next: string | null): boolean {
  const canon = (value: string | null) => (value ?? '').replace(/<p><br\s*\/?><\/p>/g, '<p></p>')
  return canon(previous) !== canon(next)
}

function lyricsProvenance(
  current: { lyrics: string | null } | null,
  lyrics: string | null
): { lyricsSource: 'MANUAL' | null; lyricsSourceUrl: null; lyricsImportedAt: null; lyricsUpdatedAt: Date } | null {
  if (!lyricsChanged(current?.lyrics ?? null, lyrics)) return null
  return {
    lyricsSource: lyrics ? 'MANUAL' : null,
    lyricsSourceUrl: null,
    lyricsImportedAt: null,
    lyricsUpdatedAt: new Date(),
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
  const parsed = parseSongFormData(formData)
  if ('error' in parsed) return parsed
  const { generic, band } = parsed
  if (!generic.title) return { error: 'Title is required.' }
  const genreIds = parseGenreIds(formData)
  const { bandId } = await getBandContext()

  // Add Song's search page sets allowDuplicate once the user has seen the matches and chosen to create
  // anyway; a form submitted without it is checked here so a copy isn't created by accident.
  if (formData.get('allowDuplicate') !== 'true') {
    const matches = await searchCatalog(bandId, { title: generic.title, artist: generic.artist })
    const duplicate = matches.find((match) => isLikelyDuplicate(generic, match))
    if (duplicate) {
      const name = duplicate.artist ? `"${duplicate.title}" by ${duplicate.artist}` : `"${duplicate.title}"`
      return {
        error: `${name} is already ${duplicate.bandSongId ? 'in your songs' : 'in the catalog'}. Search for it on Add Song instead of creating a copy.`,
      }
    }
  }

  // A song a band enters is private to it (ownerBandId); sharing it is a deliberate step, not a side effect.
  let song
  try {
    song = await prisma.song.create({
      data: {
        ...generic,
        ...lyricsProvenance(null, generic.lyrics),
        ownerBandId: bandId,
        genres: { connect: genreIds.map((genreId) => ({ id: genreId })) },
        bandSongs: { create: { bandId, ...band } },
      },
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
    await prisma.bandSong.deleteMany({ where: { songId: song.id } }).catch(() => {})
    await prisma.song.delete({ where: { id: song.id } }).catch(() => {})
    return { error: errorMessage(err, 'Failed to upload chart file.') }
  }

  revalidatePath('/songs')
  redirect('/songs')
}

// Adds an existing song (a master song, or one of this band's own) to the band's catalog without copying
// anything: the band gets its own BandSong for it, and a song it once removed comes back with its old status.
export async function addSongToCatalog(songId: string): Promise<void> {
  const { bandId } = await getBandContext()
  await assertOwned('song', bandId, songId)

  const entry = await prisma.bandSong.upsert({
    where: { bandId_songId: { bandId, songId } },
    update: { isActive: true },
    create: { bandId, songId },
  })

  revalidatePath('/songs')
  redirect(`/songs/${entry.id}/edit`)
}

export async function updateSong(
  _state: SongActionState,
  formData: FormData
): Promise<SongActionState> {
  // `id` is the BandSong id (the id the UI knows a song by); the shared Song row hangs off it.
  const id = formData.get('id') as string
  const parsed = parseSongFormData(formData)
  if ('error' in parsed) return parsed
  const { generic, band } = parsed
  if (!generic.title) return { error: 'Title is required.' }
  const genreIds = parseGenreIds(formData)

  const ctx = await getBandContext()
  const bandSong = await prisma.bandSong.findFirst({
    where: { id, bandId: ctx.bandId },
    select: { songId: true, song: { select: { ownerBandId: true, chartFileUrl: true, lyrics: true } } },
  })
  if (!bandSong) return { error: 'Song not found.' }

  // The band always owns its status/singer/keyboard. Title, lyrics, charts and the like live on the
  // shared Song, so they only change if this band may edit it; otherwise those fields are left alone.
  const canEditGeneric = canEditSong(ctx, bandSong.song)

  let chartUpdate
  let provenance
  if (canEditGeneric) {
    try {
      provenance = lyricsProvenance(bandSong.song, generic.lyrics)
      chartUpdate = await resolveChartFile(formData, bandSong.songId, bandSong.song.chartFileUrl)
    } catch (err) {
      return { error: errorMessage(err, 'Failed to upload chart file.') }
    }
  }

  try {
    await prisma.$transaction([
      prisma.bandSong.update({ where: { id }, data: band }),
      ...(canEditGeneric
        ? [
            prisma.song.update({
              where: { id: bandSong.songId },
              data: {
                ...generic,
                ...chartUpdate,
                ...provenance,
                genres: { set: genreIds.map((genreId) => ({ id: genreId })) },
              },
            }),
          ]
        : []),
    ])
  } catch {
    return { error: 'Failed to update song.' }
  }

  revalidatePath('/songs')
  redirect('/songs')
}

export async function findLyrics(id: string): Promise<{ outcome: ImportOutcome }> {
  const ctx = await getBandContext()
  const bandSong = await prisma.bandSong.findFirst({
    where: { id, bandId: ctx.bandId },
    select: { songId: true, song: { select: { ownerBandId: true } } },
  })
  if (!bandSong) throw new NotFoundError('bandSong')
  // The lyrics are written to the shared Song, so a band that can't edit it gets no import.
  if (!canEditSong(ctx, bandSong.song)) return { outcome: 'error' }

  let outcome: ImportOutcome
  try {
    outcome = await importLyricsForSong(bandSong.songId)
  } catch {
    outcome = 'error'
  }
  if (outcome === 'imported') revalidatePath(`/songs/${id}`)
  return { outcome }
}

// Removes the song from this band's catalog only; the shared Song, and other bands' entries, stay.
export async function deleteSong(id: string): Promise<void> {
  const { bandId } = await getBandContext()
  await assertOwned('bandSong', bandId, id)
  await prisma.bandSong.update({ where: { id }, data: { isActive: false } })
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
