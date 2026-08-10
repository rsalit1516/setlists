'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type GenreActionState = { error: string } | null

function parseGenreFormData(formData: FormData) {
  return {
    name: (formData.get('name') as string).trim(),
  }
}

export async function createGenre(
  _state: GenreActionState,
  formData: FormData
): Promise<GenreActionState> {
  const data = parseGenreFormData(formData)
  if (!data.name) return { error: 'Name is required.' }

  try {
    await prisma.genre.create({ data })
  } catch {
    return { error: 'Failed to create genre. A genre with this name may already exist.' }
  }

  revalidatePath('/genres')
  redirect('/genres')
}

export async function updateGenre(
  _state: GenreActionState,
  formData: FormData
): Promise<GenreActionState> {
  const id = formData.get('id') as string
  const data = parseGenreFormData(formData)
  if (!data.name) return { error: 'Name is required.' }

  try {
    await prisma.genre.update({ where: { id }, data })
  } catch {
    return { error: 'Failed to update genre. A genre with this name may already exist.' }
  }

  revalidatePath('/genres')
  revalidatePath('/songs')
  redirect('/genres')
}

// Deactivating strips the genre from every song that currently carries it in
// the same write (rather than leaving orphaned links behind an inactive
// genre) — the confirm dialog on the Genres page warns how many songs that
// affects before the user commits. Reassigning those songs to a different
// genre first is a deliberate fast-follow, not handled here (#69).
export async function deactivateGenre(id: string): Promise<void> {
  await prisma.genre.update({
    where: { id },
    data: { isActive: false, songs: { set: [] } },
  })
  revalidatePath('/genres')
  revalidatePath('/songs')
}
