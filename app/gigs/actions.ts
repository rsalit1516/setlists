'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'

export type GigActionState = { error: string } | { success: true } | null

export async function createGig(_state: GigActionState, formData: FormData): Promise<GigActionState> {
  const venueId = formData.get('venueId') as string
  const existingSetlistId = (formData.get('setlistId') as string) || null
  const shouldCreateSetlist = formData.get('createSetlist') === 'true'
  const dateStr = formData.get('date') as string
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
      venueId,
      setlistId,
      notes: notes || null,
      amountContracted: amountContractedStr ? parseFloat(amountContractedStr) : null,
    },
  })

  revalidatePath('/gigs')
  redirect(`/gigs/${gig.id}`)
}

export async function updateGig(_state: GigActionState, formData: FormData): Promise<GigActionState> {
  const id = formData.get('id') as string
  const amountContractedStr = formData.get('amountContracted') as string
  const amountPaidStr = formData.get('amountPaid') as string
  const notes = formData.get('notes') as string

  if (!id) return { error: 'Gig not found.' }

  await prisma.gig.update({
    where: { id },
    data: {
      amountContracted: amountContractedStr ? parseFloat(amountContractedStr) : null,
      amountPaid: amountPaidStr ? parseFloat(amountPaidStr) : null,
      notes: notes || null,
    },
  })

  revalidatePath(`/gigs/${id}`)
  return { success: true }
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
  const name = formData.get('name') as string

  if (!gigId || !name) return

  await prisma.gigMusician.create({ data: { gigId, name } })
  revalidatePath(`/gigs/${gigId}`)
}

export async function removeMusician(musicianId: string): Promise<void> {
  const musician = await prisma.gigMusician.update({ where: { id: musicianId }, data: { isActive: false } })
  revalidatePath(`/gigs/${musician.gigId}`)
}
