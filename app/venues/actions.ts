'use server'

import prisma from '@/lib/db'
import { getBandContext } from '@/lib/band'
import { assertOwned, isOwned } from '@/lib/ownership'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type VenueActionState = { error: string } | null

function parseVenueFormData(formData: FormData) {
  return {
    name: (formData.get('name') as string).trim(),
    address: (formData.get('address') as string).trim() || null,
    notes: (formData.get('notes') as string).trim() || null,
  }
}

export async function createVenue(
  _state: VenueActionState,
  formData: FormData
): Promise<VenueActionState> {
  const data = parseVenueFormData(formData)
  if (!data.name) return { error: 'Name is required.' }

  const { bandId } = await getBandContext()
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
  const id = formData.get('id') as string
  const data = parseVenueFormData(formData)
  if (!data.name) return { error: 'Name is required.' }

  const { bandId } = await getBandContext()
  if (!(await isOwned('venue', bandId, id))) return { error: 'Venue not found.' }

  try {
    await prisma.venue.update({ where: { id }, data })
  } catch {
    return { error: 'Failed to update venue.' }
  }

  revalidatePath('/venues')
  redirect('/venues')
}

export async function deleteVenue(id: string): Promise<void> {
  const { bandId } = await getBandContext()
  await assertOwned('venue', bandId, id)
  await prisma.venue.update({ where: { id }, data: { isActive: false } })
  revalidatePath('/venues')
}
