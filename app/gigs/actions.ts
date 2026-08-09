'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import { getGig, calculateTotalExpenses, calculateGigNet } from '@/lib/services/gigs'
import type { SetSection } from '@/lib/types'

export type GigActionState = { error: string } | null

export async function createGig(_state: GigActionState, formData: FormData): Promise<GigActionState> {
  const venueId = formData.get('venueId') as string
  const existingSetlistId = (formData.get('setlistId') as string) || null
  const shouldCreateSetlist = formData.get('createSetlist') === 'true'
  const dateStr = formData.get('date') as string
  const startTime = (formData.get('startTime') as string) || null
  const endTime = (formData.get('endTime') as string) || null
  const amountContractedStr = formData.get('amountContracted') as string
  const amountPaidStr = formData.get('amountPaid') as string
  const paidAtStr = formData.get('paidAt') as string
  const tipsStr = formData.get('tips') as string
  const otherRevenueStr = formData.get('otherRevenue') as string
  const notes = formData.get('notes') as string
  // Deduplicated: createMany below has no ON CONFLICT clause, so a duplicate
  // musicianId would violate @@unique([gigId, musicianId]) and fail the whole
  // gig creation.
  const musicianIds = [...new Set(formData.getAll('musicianIds').map(String))]

  if (!venueId) return { error: 'Venue is required.' }
  if (!dateStr) return { error: 'Date is required.' }

  const date = new Date(dateStr + 'T12:00:00')
  if (isNaN(date.getTime())) return { error: 'Invalid date.' }

  if (!existingSetlistId && !shouldCreateSetlist) {
    return { error: 'Please check "Create setlist" or link an existing one.' }
  }

  const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { name: true } })
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(2)
  const name = venue ? `${venue.name} - ${mm}-${dd}-${yy}` : `${mm}-${dd}-${yy}`

  let setlistId: string
  if (existingSetlistId) {
    // A Setlist is strictly 1:1 with its Gig (see #41 — reverts #34's
    // reuse-by-reference model, which let SetlistItem.wasPlayed silently
    // become shared state across every gig reusing the same setlist row).
    // "Reuse" means copy: clone the source setlist's songs into a new
    // Setlist owned by this gig, same as the old copySetlist action did.
    const source = await prisma.setlist.findUnique({
      where: { id: existingSetlistId },
      include: {
        items: { where: { isActive: true }, orderBy: [{ section: 'asc' }, { setNumber: 'asc' }, { order: 'asc' }] },
      },
    })
    const setlist = await prisma.setlist.create({
      data: {
        name,
        items: {
          create: (source?.items ?? []).map((item) => ({
            songId: item.songId,
            section: item.section as SetSection,
            setNumber: item.setNumber,
            order: item.order,
          })),
        },
      },
    })
    setlistId = setlist.id
  } else {
    const setlist = await prisma.setlist.create({ data: { name } })
    setlistId = setlist.id
  }

  const gig = await prisma.gig.create({
    data: {
      date,
      startTime,
      endTime,
      venueId,
      setlistId,
      notes: notes || null,
      amountContracted: amountContractedStr ? parseFloat(amountContractedStr) : null,
      amountPaid: amountPaidStr ? parseFloat(amountPaidStr) : null,
      paidAt: paidAtStr ? new Date(paidAtStr + 'T12:00:00') : null,
      tips: tipsStr ? parseFloat(tipsStr) : null,
      otherRevenue: otherRevenueStr ? parseFloat(otherRevenueStr) : null,
    },
  })

  if (musicianIds.length > 0) {
    await prisma.gigMusician.createMany({
      data: musicianIds.map((musicianId) => ({ gigId: gig.id, musicianId })),
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
  const paidAtStr = formData.get('paidAt') as string
  const tipsStr = formData.get('tips') as string
  const otherRevenueStr = formData.get('otherRevenue') as string
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
      paidAt: paidAtStr ? new Date(paidAtStr + 'T12:00:00') : null,
      tips: tipsStr ? parseFloat(tipsStr) : null,
      otherRevenue: otherRevenueStr ? parseFloat(otherRevenueStr) : null,
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

export async function bulkAddMusicians(formData: FormData): Promise<void> {
  const gigId = formData.get('gigId') as string
  const musicianIds = formData.getAll('musicianIds').map(String)

  if (!gigId || musicianIds.length === 0) return

  // A musician previously removed from this gig leaves behind an inactive
  // GigMusician row, which the @@unique([gigId, musicianId]) constraint
  // still occupies — reactivate it instead of inserting a duplicate.
  await Promise.all(
    musicianIds.map((musicianId) =>
      prisma.gigMusician.upsert({
        where: { gigId_musicianId: { gigId, musicianId } },
        create: { gigId, musicianId },
        update: { isActive: true },
      })
    )
  )
  revalidatePath(`/gigs/${gigId}`)
}

export async function removeMusician(musicianId: string): Promise<void> {
  const musician = await prisma.gigMusician.update({ where: { id: musicianId }, data: { isActive: false } })
  revalidatePath(`/gigs/${musician.gigId}`)
}

// Backs the Edit Gig form's standalone Musicians section: the checked state of
// the roster checklist directly IS the gig's musician list, submitted via its
// own action/button independent of the rest of the form's Save Changes.
export async function syncGigMusicians(formData: FormData): Promise<void> {
  const gigId = formData.get('gigId') as string
  if (!gigId) return

  const selectedIds = new Set(formData.getAll('musicianIds').map(String))

  const current = await prisma.gigMusician.findMany({
    where: { gigId, isActive: true },
    select: { id: true, musicianId: true },
  })
  const currentIds = new Set(current.map((gm) => gm.musicianId))

  const toAdd = [...selectedIds].filter((musicianId) => !currentIds.has(musicianId))
  const toRemove = current.filter((gm) => !selectedIds.has(gm.musicianId))

  await Promise.all([
    ...toAdd.map((musicianId) =>
      prisma.gigMusician.upsert({
        where: { gigId_musicianId: { gigId, musicianId } },
        create: { gigId, musicianId },
        update: { isActive: true },
      })
    ),
    ...(toRemove.length > 0
      ? [
          prisma.gigMusician.updateMany({
            where: { id: { in: toRemove.map((gm) => gm.id) } },
            data: { isActive: false },
          }),
        ]
      : []),
  ])

  revalidatePath(`/gigs/${gigId}`)
}

export async function updateMusicianPayment(formData: FormData): Promise<void> {
  const gigMusicianId = formData.get('gigMusicianId') as string
  const amountPaidStr = formData.get('amountPaid') as string
  const paidAtStr = formData.get('paidAt') as string

  if (!gigMusicianId) return

  const musician = await prisma.gigMusician.update({
    where: { id: gigMusicianId },
    data: {
      amountPaid: amountPaidStr ? parseFloat(amountPaidStr) : null,
      paidAt: paidAtStr ? new Date(paidAtStr + 'T12:00:00') : null,
    },
  })
  revalidatePath(`/gigs/${musician.gigId}`)
}

export async function markAllMusiciansPaid(formData: FormData): Promise<void> {
  const gigId = formData.get('gigId') as string
  const paidAtStr = formData.get('paidAt') as string

  if (!gigId || !paidAtStr) return

  const gig = await getGig(gigId)
  if (!gig || gig.musicians.length === 0) return

  const totalExpenses = calculateTotalExpenses(gig.expenses)
  const net = calculateGigNet(gig, totalExpenses)
  const splitAmount = net / gig.musicians.length

  await prisma.gigMusician.updateMany({
    where: { gigId, isActive: true },
    data: { amountPaid: splitAmount, paidAt: new Date(paidAtStr + 'T12:00:00') },
  })
  revalidatePath(`/gigs/${gigId}`)
}
