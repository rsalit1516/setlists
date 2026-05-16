'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SetSection } from '@/lib/types'

export type SetlistActionState = { error: string } | null

// ── Create / Delete ───────────────────────────────────────────────────────────

export async function createSetlist(
  _state: SetlistActionState,
  formData: FormData
): Promise<SetlistActionState> {
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Name is required.' }

  let id: string
  try {
    const setlist = await prisma.setlist.create({ data: { name } })
    id = setlist.id
  } catch {
    return { error: 'Failed to create setlist.' }
  }

  revalidatePath('/setlists')
  redirect(`/setlists/${id}`)
}

export async function deleteSetlist(id: string): Promise<void> {
  await prisma.setlistItem.deleteMany({ where: { setlistId: id } })
  await prisma.setlist.delete({ where: { id } })
  revalidatePath('/setlists')
}

// ── Items ─────────────────────────────────────────────────────────────────────

export async function addItem(formData: FormData): Promise<void> {
  const setlistId = formData.get('setlistId') as string
  const songId = formData.get('songId') as string
  const section = formData.get('section') as SetSection
  const setNumber = parseInt(formData.get('setNumber') as string) || 1

  const lastItem = await prisma.setlistItem.findFirst({
    where: { setlistId, section, setNumber },
    orderBy: { order: 'desc' },
  })
  const order = (lastItem?.order ?? 0) + 1

  await prisma.setlistItem.create({
    data: { setlistId, songId, section, setNumber, order },
  })

  revalidatePath(`/setlists/${setlistId}`)
}

export async function removeItem(itemId: string): Promise<void> {
  const item = await prisma.setlistItem.delete({ where: { id: itemId } })
  revalidatePath(`/setlists/${item.setlistId}`)
}

export async function moveItem(itemId: string, direction: 'up' | 'down'): Promise<void> {
  type Row = { id: string; setlistId: string; section: string; setNumber: number; order: number }
  const item = (await prisma.setlistItem.findUnique({ where: { id: itemId } })) as Row | null
  if (!item) return

  const neighbor = (await prisma.setlistItem.findFirst({
    where: {
      setlistId: item.setlistId,
      section: item.section as SetSection,
      setNumber: item.setNumber,
      order: direction === 'up' ? { lt: item.order } : { gt: item.order },
    },
    orderBy: { order: direction === 'up' ? 'desc' : 'asc' },
  })) as Row | null
  if (!neighbor) return

  await prisma.$transaction([
    prisma.setlistItem.update({ where: { id: item.id }, data: { order: neighbor.order } }),
    prisma.setlistItem.update({ where: { id: neighbor.id }, data: { order: item.order } }),
  ])

  revalidatePath(`/setlists/${item.setlistId}`)
}

export async function togglePlayed(
  itemId: string,
  current: boolean | null
): Promise<void> {
  const next = current === true ? false : current === false ? null : true
  const item = await prisma.setlistItem.update({
    where: { id: itemId },
    data: { wasPlayed: next } as Record<string, unknown>,
  })
  revalidatePath(`/setlists/${(item as { setlistId: string }).setlistId}`)
}

export async function renameSetlist(
  _state: SetlistActionState,
  formData: FormData
): Promise<SetlistActionState> {
  const id = formData.get('id') as string
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Name is required.' }

  try {
    await prisma.setlist.update({ where: { id }, data: { name } })
  } catch {
    return { error: 'Failed to rename setlist.' }
  }

  revalidatePath(`/setlists/${id}`)
  revalidatePath('/setlists')
  redirect(`/setlists/${id}`)
}
