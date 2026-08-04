'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'

export type GigActionState = { error: string } | null

const DEFAULT_MUSICIANS = ['Richard Salit', 'Jeff Zbar', 'Scott Tunis', 'Andrew Guerrero']

export async function createGig(_state: GigActionState, formData: FormData): Promise<GigActionState> {
  const venueId = formData.get('venueId') as string
  const existingSetlistId = (formData.get('setlistId') as string) || null
  const shouldCreateSetlist = formData.get('createSetlist') === 'true'
  const dateStr = formData.get('date') as string
  const startTime = (formData.get('startTime') as string) || null
  const endTime = (formData.get('endTime') as string) || null
  const amountContractedStr = formData.get('amountContracted') as string
  const notes = formData.get('notes') as string

  if (!venueId) return { error: 'Venue is required.' }
  if (!dateStr) return { error: 'Date is required.' }

  const date = new Date(dateStr + 'T12:00:00')
  if (isNaN(date.getTime())) return { error: 'Invalid date.' }

  let setlistId = existingSetlistId
  if (shouldCreateSetlist) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { name: true } })
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const yy = String(date.getFullYear()).slice(2)
    const name = venue ? `${venue.name} - ${mm}-${dd}-${yy}` : `${mm}-${dd}-${yy}`
    const setlist = await prisma.setlist.create({ data: { name } })
    setlistId = setlist.id
  }

  if (!setlistId) return { error: 'Please check "Create setlist" or link an existing one.' }

  const gig = await prisma.gig.create({
    data: {
      date,
      startTime,
      endTime,
      venueId,
      setlistId,
      notes: notes || null,
      amountContracted: amountContractedStr ? parseFloat(amountContractedStr) : null,
    },
  })

  const defaultMusicians = await prisma.musician.findMany({
    where: { name: { in: DEFAULT_MUSICIANS }, isActive: true },
  })
  if (defaultMusicians.length > 0) {
    await prisma.gigMusician.createMany({
      data: defaultMusicians.map((m) => ({ gigId: gig.id, musicianId: m.id })),
    })
  }

  revalidatePath('/gigs')
  redirect(`/gigs/${gig.id}`)
}

export async function updateGig(_state: GigActionState, formData: FormData): Promise<GigActionState> {
  const id = formData.get('id') as string
  const venueId = formData.get('venueId') as string
  const dateStr = formData.get('date') as string
  const startTime = (formData.get('startTime') as string) || null
  const endTime = (formData.get('endTime') as string) || null
  const amountContractedStr = formData.get('amountContracted') as string
  const amountPaidStr = formData.get('amountPaid') as string
  const notes = formData.get('notes') as string

  if (!id) return { error: 'Gig not found.' }
  if (!venueId) return { error: 'Venue is required.' }
  if (!dateStr) return { error: 'Date is required.' }

  const date = new Date(dateStr + 'T12:00:00')
  if (isNaN(date.getTime())) return { error: 'Invalid date.' }

  await prisma.gig.update({
    where: { id },
    data: {
      date,
      startTime,
      endTime,
      venueId,
      amountContracted: amountContractedStr ? parseFloat(amountContractedStr) : null,
      amountPaid: amountPaidStr ? parseFloat(amountPaidStr) : null,
      notes: notes || null,
    },
  })

  revalidatePath('/gigs')
  redirect(`/gigs/${id}`)
}

export async function deleteGig(id: string): Promise<void> {
  await prisma.expense.updateMany({ where: { gigId: id }, data: { isActive: false } })
  await prisma.gigMusician.updateMany({ where: { gigId: id }, data: { isActive: false } })
  await prisma.gig.update({ where: { id }, data: { isActive: false } })
  revalidatePath('/gigs')
  redirect('/gigs')
}

export async function addExpense(formData: FormData): Promise<void> {
  const gigId = formData.get('gigId') as string
  const description = formData.get('description') as string
  const amount = formData.get('amount') as string

  if (!gigId || !description || !amount) return

  await prisma.expense.create({ data: { gigId, description, amount: parseFloat(amount) } })
  revalidatePath(`/gigs/${gigId}`)
}

export async function removeExpense(expenseId: string): Promise<void> {
  const expense = await prisma.expense.update({ where: { id: expenseId }, data: { isActive: false } })
  revalidatePath(`/gigs/${expense.gigId}`)
}

export async function addMusician(formData: FormData): Promise<void> {
  const gigId = formData.get('gigId') as string
  const musicianId = formData.get('musicianId') as string

  if (!gigId || !musicianId) return

  // A musician previously removed from this gig leaves behind an inactive
  // GigMusician row, which the @@unique([gigId, musicianId]) constraint
  // still occupies — reactivate it instead of inserting a duplicate.
  await prisma.gigMusician.upsert({
    where: { gigId_musicianId: { gigId, musicianId } },
    create: { gigId, musicianId },
    update: { isActive: true },
  })
  revalidatePath(`/gigs/${gigId}`)
}

export async function removeMusician(musicianId: string): Promise<void> {
  const musician = await prisma.gigMusician.update({ where: { id: musicianId }, data: { isActive: false } })
  revalidatePath(`/gigs/${musician.gigId}`)
}
