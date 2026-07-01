'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type SongActionState = { error: string } | null

type SongStatus = 'READY' | 'IN_PROGRESS' | 'WISH'

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
    orientation: (formData.get('orientation') as string).trim() || null,
    bpm: formData.get('bpm') ? parseInt(formData.get('bpm') as string) || null : null,
    lyricsUrl: (formData.get('lyricsUrl') as string).trim() || null,
    chartsUrl: (formData.get('chartsUrl') as string).trim() || null,
  }
}

export async function createSong(
  _state: SongActionState,
  formData: FormData
): Promise<SongActionState> {
  const data = parseSongFormData(formData)
  if (!data.title) return { error: 'Title is required.' }

  try {
    await prisma.song.create({ data })
  } catch {
    return { error: 'Failed to create song.' }
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

  try {
    await prisma.song.update({ where: { id }, data })
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
