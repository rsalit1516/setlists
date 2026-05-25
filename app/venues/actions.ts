'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export type VenueActionState = { error: string } | null

function parseVenueFormData(formData: FormData) {
  return {
    name: (formData.get('name') as string).trim(),
    address: (formData.get('address') as string).trim() || null,
    notes: (formData.get('notes') as string).trim() || null,
  }
}

async function getBandId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.activeBandId ?? null
}

export async function createVenue(
  _state: VenueActionState,
  formData: FormData
): Promise<VenueActionState> {
  const bandId = await getBandId()
  if (!bandId) return { error: 'Not authenticated.' }

  const data = parseVenueFormData(formData)
  if (!data.name) return { error: 'Name is required.' }

  try {
    await prisma.venue.create({ data: { ...data, bandId } })
  } catch {
    return { error: 'Failed to create venue.' }
  }

  revalidatePath('/venues')
  redirect('/venues')
}

export async function updateVenue(
  _state: VenueActionState,
  formData: FormData
): Promise<VenueActionState> {
  const bandId = await getBandId()
  if (!bandId) return { error: 'Not authenticated.' }

  const id = formData.get('id') as string
  const data = parseVenueFormData(formData)
  if (!data.name) return { error: 'Name is required.' }

  try {
    const count = await prisma.venue.updateMany({ where: { id, bandId }, data })
    if (count.count === 0) return { error: 'Venue not found.' }
  } catch {
    return { error: 'Failed to update venue.' }
  }

  revalidatePath('/venues')
  redirect('/venues')
}

export async function deleteVenue(id: string): Promise<void> {
  const bandId = await getBandId()
  if (!bandId) return
  await prisma.venue.deleteMany({ where: { id, bandId } })
  revalidatePath('/venues')
}
