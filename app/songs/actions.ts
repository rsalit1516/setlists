'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { uploadChartFile, deleteChartFile } from '@/lib/services/azure-blob'

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
    lyrics: (formData.get('lyrics') as string).trim() || null,
  }
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

export async function createSong(
  _state: SongActionState,
  formData: FormData
): Promise<SongActionState> {
  const data = parseSongFormData(formData)
  if (!data.title) return { error: 'Title is required.' }

  try {
    const song = await prisma.song.create({ data })
    const chartUpdate = await resolveChartFile(formData, song.id, null)
    if (chartUpdate) {
      await prisma.song.update({ where: { id: song.id }, data: chartUpdate })
    }
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
    const current = await prisma.song.findUnique({ where: { id }, select: { chartFileUrl: true } })
    const chartUpdate = await resolveChartFile(formData, id, current?.chartFileUrl ?? null)
    await prisma.song.update({ where: { id }, data: { ...data, ...chartUpdate } })
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
