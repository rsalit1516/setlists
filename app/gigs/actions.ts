'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import { auth } from '@/auth'

export type GigActionState = { error: string } | { success: true } | null

async function getBandId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.activeBandId ?? null
}

export async function createGig(_state: GigActionState, formData: FormData): Promise<GigActionState> {
  const bandId = await getBandId()
  if (!bandId) return { error: 'Not authenticated.' }

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

  const venue = await prisma.venue.findFirst({ where: { id: venueId, bandId } })
  if (!venue) return { error: 'Venue not found.' }

  if (existingSetlistId) {
    const setlist = await prisma.setlist.findFirst({ where: { id: existingSetlistId, bandId } })
    if (!setlist) return { error: 'Setlist not found.' }
  }

  let setlistId = existingSetlistId
  if (shouldCreateSetlist) {
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const yy = String(date.getFullYear()).slice(2)
    const name = `${venue.name} - ${mm}-${dd}-${yy}`
    const setlist = await prisma.setlist.create({ data: { name, bandId } })
    setlistId = setlist.id
  }

  if (!setlistId) return { error: 'Please check "Create setlist" or link an existing one.' }

  const gig = await prisma.gig.create({
    data: {
      date,
      venueId,
      setlistId,
      bandId,
      notes: notes || null,
      amountContracted: amountContractedStr ? parseFloat(amountContractedStr) : null,
    },
  })

  revalidatePath('/gigs')
  redirect(`/gigs/${gig.id}`)
}

export async function updateGig(_state: GigActionState, formData: FormData): Promise<GigActionState> {
  const bandId = await getBandId()
  if (!bandId) return { error: 'Not authenticated.' }

  const id = formData.get('id') as string
  const amountContractedStr = formData.get('amountContracted') as string
  const amountPaidStr = formData.get('amountPaid') as string
  const notes = formData.get('notes') as string

  if (!id) return { error: 'Gig not found.' }

  const count = await prisma.gig.updateMany({
    where: { id, bandId },
    data: {
      amountContracted: amountContractedStr ? parseFloat(amountContractedStr) : null,
      amountPaid: amountPaidStr ? parseFloat(amountPaidStr) : null,
      notes: notes || null,
    },
  })
  if (count.count === 0) return { error: 'Gig not found.' }

  revalidatePath(`/gigs/${id}`)
  return { success: true }
}

export async function deleteGig(id: string): Promise<void> {
  const bandId = await getBandId()
  if (!bandId) return
  const gig = await prisma.gig.findFirst({ where: { id, bandId } })
  if (!gig) return
  await prisma.expense.deleteMany({ where: { gigId: id } })
  await prisma.gigMusician.deleteMany({ where: { gigId: id } })
  await prisma.gig.delete({ where: { id } })
  revalidatePath('/gigs')
  redirect('/gigs')
}

export async function addExpense(formData: FormData): Promise<void> {
  const bandId = await getBandId()
  if (!bandId) return

  const gigId = formData.get('gigId') as string
  const description = formData.get('description') as string
  const amount = formData.get('amount') as string

  if (!gigId || !description || !amount) return

  const gig = await prisma.gig.findFirst({ where: { id: gigId, bandId } })
  if (!gig) return

  await prisma.expense.create({ data: { gigId, description, amount: parseFloat(amount) } })
  revalidatePath(`/gigs/${gigId}`)
}

export async function removeExpense(expenseId: string): Promise<void> {
  const bandId = await getBandId()
  if (!bandId) return

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { gig: { select: { bandId: true } } },
  })
  if (!expense || expense.gig.bandId !== bandId) return

  await prisma.expense.delete({ where: { id: expenseId } })
  revalidatePath(`/gigs/${expense.gigId}`)
}

export async function addMusician(formData: FormData): Promise<void> {
  const bandId = await getBandId()
  if (!bandId) return

  const gigId = formData.get('gigId') as string
  const name = formData.get('name') as string

  if (!gigId || !name) return

  const gig = await prisma.gig.findFirst({ where: { id: gigId, bandId } })
  if (!gig) return

  await prisma.gigMusician.create({ data: { gigId, name } })
  revalidatePath(`/gigs/${gigId}`)
}

export async function removeMusician(musicianId: string): Promise<void> {
  const bandId = await getBandId()
  if (!bandId) return

  const musician = await prisma.gigMusician.findUnique({
    where: { id: musicianId },
    include: { gig: { select: { bandId: true } } },
  })
  if (!musician || musician.gig.bandId !== bandId) return

  await prisma.gigMusician.delete({ where: { id: musicianId } })
  revalidatePath(`/gigs/${musician.gigId}`)
}
