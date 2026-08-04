'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type MusicianActionState = { error: string } | null

function parseMusicianFormData(formData: FormData) {
  return {
    name: (formData.get('name') as string).trim(),
  }
}

export async function createMusician(
  _state: MusicianActionState,
  formData: FormData
): Promise<MusicianActionState> {
  const data = parseMusicianFormData(formData)
  if (!data.name) return { error: 'Name is required.' }

  try {
    await prisma.musician.create({ data })
  } catch {
    return { error: 'Failed to create musician.' }
  }

  revalidatePath('/musicians')
  redirect('/musicians')
}

export async function updateMusician(
  _state: MusicianActionState,
  formData: FormData
): Promise<MusicianActionState> {
  const id = formData.get('id') as string
  const data = parseMusicianFormData(formData)
  if (!data.name) return { error: 'Name is required.' }

  try {
    await prisma.musician.update({ where: { id }, data })
  } catch {
    return { error: 'Failed to update musician.' }
  }

  revalidatePath('/musicians')
  redirect('/musicians')
}

export async function deleteMusician(id: string): Promise<void> {
  await prisma.musician.update({ where: { id }, data: { isActive: false } })
  revalidatePath('/musicians')
}
