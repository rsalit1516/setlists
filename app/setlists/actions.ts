'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getBandContext } from '@/lib/band'
import { assertOwned, isOwned, NotFoundError } from '@/lib/ownership'
import type { SetSection } from '@/lib/types'

export type SetlistActionState = { error: string } | null

// Create/delete/copy no longer live here — a Setlist is strictly 1:1 with its
// Gig (#41), so its lifecycle is owned by app/gigs/actions.ts (createGig
// creates or clones one; deleting a gig is out of scope for this issue).

// ── Items ─────────────────────────────────────────────────────────────────────

export async function addItem(formData: FormData): Promise<void> {
  const setlistId = formData.get('setlistId') as string
  // The form field is still called songId, but its value is the BandSong id (what the picker lists).
  const bandSongId = formData.get('songId') as string
  const section = formData.get('section') as SetSection
  const setNumber = parseInt(formData.get('setNumber') as string) || 1

  const { bandId } = await getBandContext()
  await assertOwned('setlist', bandId, setlistId)
  // Looked up within the band, so a song from another band's catalog can't be added; also gives the
  // legacy songId the SetlistItem still has to carry until #136.
  const bandSong = await prisma.bandSong.findFirst({
    where: { id: bandSongId, bandId, isActive: true },
    select: { songId: true },
  })
  if (!bandSong) throw new NotFoundError('bandSong')

  const lastItem = await prisma.setlistItem.findFirst({
    where: { setlistId, section, setNumber },
    orderBy: { order: 'desc' },
  })
  const order = (lastItem?.order ?? 0) + 1

  await prisma.setlistItem.create({
    data: { setlistId, bandSongId, songId: bandSong.songId, section, setNumber, order },
  })

  revalidatePath(`/setlists/${setlistId}`)
}

export async function removeItem(itemId: string): Promise<void> {
  const { bandId } = await getBandContext()
  await assertOwned('setlistItem', bandId, itemId)
  const item = await prisma.setlistItem.update({ where: { id: itemId }, data: { isActive: false } })
  revalidatePath(`/setlists/${item.setlistId}`)
}

export async function moveItem(itemId: string, direction: 'up' | 'down'): Promise<void> {
  type Row = { id: string; setlistId: string; section: string; setNumber: number; order: number }
  const { bandId } = await getBandContext()
  await assertOwned('setlistItem', bandId, itemId)
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

export async function reorderItems(setlistId: string, orderedItemIds: string[]): Promise<void> {
  const { bandId } = await getBandContext()
  await assertOwned('setlist', bandId, setlistId)
  await assertOwned('setlistItem', bandId, ...orderedItemIds)
  await prisma.$transaction(
    orderedItemIds.map((id, index) =>
      prisma.setlistItem.update({ where: { id }, data: { order: index } })
    )
  )
  revalidatePath(`/setlists/${setlistId}`)
}

// Cross-set drag-and-drop (#82): unlike reorderItems, the moved item also
// changes section/setNumber. destinationOrderedIds is the target
// section/setNumber's final order (itemId included); sourceOrderedIds is
// what's left behind in the section it was dragged out of — both get
// re-sequenced in the same transaction so order stays contiguous per list.
export async function moveItemToSection(
  setlistId: string,
  itemId: string,
  target: { section: SetSection; setNumber: number },
  destinationOrderedIds: string[],
  sourceOrderedIds: string[]
): Promise<void> {
  // The caller always builds destinationOrderedIds by inserting itemId into
  // its new container, but if it's ever missing the item silently keeps its
  // old section/setNumber while everything around it re-numbers — fail loud
  // instead of writing that half-moved state.
  if (!destinationOrderedIds.includes(itemId)) {
    throw new Error('moveItemToSection: itemId must be included in destinationOrderedIds')
  }

  const { bandId } = await getBandContext()
  await assertOwned('setlist', bandId, setlistId)
  await assertOwned('setlistItem', bandId, ...destinationOrderedIds, ...sourceOrderedIds)

  const destinationUpdates = destinationOrderedIds.map((id, index) =>
    prisma.setlistItem.update({
      where: { id },
      data:
        id === itemId
          ? { order: index, section: target.section, setNumber: target.setNumber }
          : { order: index },
    })
  )
  const sourceUpdates = sourceOrderedIds.map((id, index) =>
    prisma.setlistItem.update({ where: { id }, data: { order: index } })
  )

  await prisma.$transaction([...destinationUpdates, ...sourceUpdates])
  revalidatePath(`/setlists/${setlistId}`)
}

export async function togglePlayed(
  itemId: string,
  current: boolean | null
): Promise<void> {
  const next = current === true ? false : current === false ? null : true
  const { bandId } = await getBandContext()
  await assertOwned('setlistItem', bandId, itemId)
  const item = await prisma.setlistItem.update({
    where: { id: itemId },
    data: { wasPlayed: next } as Record<string, unknown>,
  })
  revalidatePath(`/setlists/${(item as { setlistId: string }).setlistId}`)
}

// Bulk revision-mode action — see #84. Always overwrites wasPlayed to true for
// every matching active item, including ones previously marked Skipped; there's
// no "only fill blanks" mode. Soundcheck is never a valid scope (stats ignore it).
export type MarkPlayedScope =
  | 'all'
  | { section: 'MAIN' | 'ENCORE'; setNumber: number }

export async function markSectionPlayed(
  setlistId: string,
  scope: MarkPlayedScope
): Promise<void> {
  const { bandId } = await getBandContext()
  await assertOwned('setlist', bandId, setlistId)

  const sectionFilter =
    scope === 'all'
      ? { in: ['MAIN', 'ENCORE'] as SetSection[] }
      : (scope.section as SetSection)

  await prisma.setlistItem.updateMany({
    where: {
      setlistId,
      isActive: true,
      section: sectionFilter,
      ...(scope !== 'all' ? { setNumber: scope.setNumber } : {}),
    },
    data: { wasPlayed: true } as Record<string, unknown>,
  })

  revalidatePath(`/setlists/${setlistId}`)
}

export async function renameSetlist(
  _state: SetlistActionState,
  formData: FormData
): Promise<SetlistActionState> {
  const id = formData.get('id') as string
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Name is required.' }

  const { bandId } = await getBandContext()
  if (!(await isOwned('setlist', bandId, id))) return { error: 'Setlist not found.' }

  try {
    await prisma.setlist.update({ where: { id }, data: { name } })
  } catch {
    return { error: 'Failed to rename setlist.' }
  }

  revalidatePath(`/setlists/${id}`)
  redirect(`/setlists/${id}`)
}
