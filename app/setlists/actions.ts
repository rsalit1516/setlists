'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import type { SetSection } from '@/lib/types'

export type SetlistActionState = { error: string } | null

async function getBandId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.activeBandId ?? null
}

// ── Create / Delete ───────────────────────────────────────────────────────────

export async function createSetlist(
  _state: SetlistActionState,
  formData: FormData
): Promise<SetlistActionState> {
  const bandId = await getBandId()
  if (!bandId) return { error: 'Not authenticated.' }

  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Name is required.' }

  let id: string
  try {
    const setlist = await prisma.setlist.create({ data: { name, bandId } })
    id = setlist.id
  } catch {
    return { error: 'Failed to create setlist.' }
  }

  revalidatePath('/setlists')
  redirect(`/setlists/${id}`)
}

export async function deleteSetlist(id: string): Promise<void> {
  const bandId = await getBandId()
  if (!bandId) return
  const setlist = await prisma.setlist.findFirst({ where: { id, bandId } })
  if (!setlist) return
  await prisma.setlistItem.deleteMany({ where: { setlistId: id } })
  await prisma.setlist.delete({ where: { id } })
  revalidatePath('/setlists')
}

export async function copySetlist(id: string): Promise<void> {
  const bandId = await getBandId()
  if (!bandId) return

  const source = await prisma.setlist.findFirst({
    where: { id, bandId },
    include: { items: { orderBy: [{ section: 'asc' }, { setNumber: 'asc' }, { order: 'asc' }] } },
  })
  if (!source) return

  const copy = await prisma.setlist.create({
    data: {
      name: `Copy of ${source.name}`,
      bandId,
      items: {
        create: source.items.map((item) => ({
          songId: item.songId,
          section: item.section as SetSection,
          setNumber: item.setNumber,
          order: item.order,
        })),
      },
    },
  })

  revalidatePath('/setlists')
  redirect(`/setlists/${copy.id}`)
}

// ── Items ─────────────────────────────────────────────────────────────────────

export async function addItem(formData: FormData): Promise<void> {
  const bandId = await getBandId()
  if (!bandId) return

  const setlistId = formData.get('setlistId') as string
  const songId = formData.get('songId') as string
  const section = formData.get('section') as SetSection
  const setNumber = parseInt(formData.get('setNumber') as string) || 1

  const setlist = await prisma.setlist.findFirst({ where: { id: setlistId, bandId } })
  if (!setlist) return

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
  const bandId = await getBandId()
  if (!bandId) return

  const item = await prisma.setlistItem.findUnique({
    where: { id: itemId },
    include: { setlist: { select: { bandId: true } } },
  })
  if (!item || item.setlist.bandId !== bandId) return

  await prisma.setlistItem.delete({ where: { id: itemId } })
  revalidatePath(`/setlists/${item.setlistId}`)
}

export async function moveItem(itemId: string, direction: 'up' | 'down'): Promise<void> {
  const bandId = await getBandId()
  if (!bandId) return

  type Row = { id: string; setlistId: string; section: string; setNumber: number; order: number }
  const item = (await prisma.setlistItem.findUnique({
    where: { id: itemId },
    include: { setlist: { select: { bandId: true } } },
  })) as (Row & { setlist: { bandId: string | null } }) | null

  if (!item || item.setlist.bandId !== bandId) return

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
  const bandId = await getBandId()
  if (!bandId) return

  const existing = await prisma.setlistItem.findUnique({
    where: { id: itemId },
    include: { setlist: { select: { bandId: true } } },
  })
  if (!existing || existing.setlist.bandId !== bandId) return

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
  const bandId = await getBandId()
  if (!bandId) return { error: 'Not authenticated.' }

  const id = formData.get('id') as string
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Name is required.' }

  try {
    const count = await prisma.setlist.updateMany({ where: { id, bandId }, data: { name } })
    if (count.count === 0) return { error: 'Setlist not found.' }
  } catch {
    return { error: 'Failed to rename setlist.' }
  }

  revalidatePath(`/setlists/${id}`)
  revalidatePath('/setlists')
  redirect(`/setlists/${id}`)
}
