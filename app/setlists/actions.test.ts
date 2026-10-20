import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    setlistItem: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    setlist: {
      update: vi.fn(),
    },
    bandSong: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.resolve(ops)),
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/ownership', async () => ({
  ...(await vi.importActual<typeof import('@/lib/ownership')>('@/lib/ownership')),
  isOwned: vi.fn(),
  areOwned: vi.fn(),
  assertOwned: vi.fn(),
}))

import prisma from '@/lib/db'
import { isOwned, areOwned, assertOwned, NotFoundError } from '@/lib/ownership'
import { revalidatePath } from 'next/cache'
import {
  reorderItems,
  markSectionPlayed,
  moveItemToSection,
  addItem,
  removeItem,
  moveItem,
  togglePlayed,
  renameSetlist,
} from './actions'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isOwned).mockResolvedValue(true)
  vi.mocked(areOwned).mockResolvedValue(true)
  vi.mocked(assertOwned).mockResolvedValue(undefined)
})

describe('reorderItems', () => {
  it('writes sequential order values matching the given id order', async () => {
    vi.mocked(prisma.setlistItem.update).mockResolvedValue({} as never)

    await reorderItems('sl-1', ['c', 'a', 'b'])

    expect(prisma.setlistItem.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'c' },
      data: { order: 0 },
    })
    expect(prisma.setlistItem.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'a' },
      data: { order: 1 },
    })
    expect(prisma.setlistItem.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'b' },
      data: { order: 2 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith('/setlists/sl-1')
  })

  it('handles an empty list without error', async () => {
    await reorderItems('sl-1', [])

    expect(prisma.setlistItem.update).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/setlists/sl-1')
  })
})

describe('moveItemToSection', () => {
  it('sets section/setNumber on the moved item and re-sequences both the destination and source lists', async () => {
    vi.mocked(prisma.setlistItem.update).mockResolvedValue({} as never)

    await moveItemToSection('sl-1', 'x', { section: 'MAIN', setNumber: 2 }, ['a', 'x', 'b'], ['c', 'd'])

    expect(prisma.setlistItem.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'a' },
      data: { order: 0 },
    })
    expect(prisma.setlistItem.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'x' },
      data: { order: 1, section: 'MAIN', setNumber: 2 },
    })
    expect(prisma.setlistItem.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'b' },
      data: { order: 2 },
    })
    expect(prisma.setlistItem.update).toHaveBeenNthCalledWith(4, {
      where: { id: 'c' },
      data: { order: 0 },
    })
    expect(prisma.setlistItem.update).toHaveBeenNthCalledWith(5, {
      where: { id: 'd' },
      data: { order: 1 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith('/setlists/sl-1')
  })

  it('handles moving into an empty destination, leaving nothing behind in the source', async () => {
    vi.mocked(prisma.setlistItem.update).mockResolvedValue({} as never)

    await moveItemToSection('sl-1', 'x', { section: 'ENCORE', setNumber: 1 }, ['x'], [])

    expect(prisma.setlistItem.update).toHaveBeenCalledTimes(1)
    expect(prisma.setlistItem.update).toHaveBeenCalledWith({
      where: { id: 'x' },
      data: { order: 0, section: 'ENCORE', setNumber: 1 },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/setlists/sl-1')
  })

  it('rejects a destination list that is missing the moved item, without writing anything', async () => {
    await expect(
      moveItemToSection('sl-1', 'x', { section: 'MAIN', setNumber: 2 }, ['a', 'b'], ['c'])
    ).rejects.toThrow('itemId must be included in destinationOrderedIds')

    expect(prisma.setlistItem.update).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('markSectionPlayed', () => {
  it('scope "all" marks every active MAIN and ENCORE item, excluding Soundcheck', async () => {
    vi.mocked(prisma.setlistItem.updateMany).mockResolvedValue({ count: 5 } as never)

    await markSectionPlayed('sl-1', 'all')

    expect(prisma.setlistItem.updateMany).toHaveBeenCalledWith({
      where: {
        setlistId: 'sl-1',
        isActive: true,
        section: { in: ['MAIN', 'ENCORE'] },
      },
      data: { wasPlayed: true },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/setlists/sl-1')
  })

  it('a section scope marks only that section and set number', async () => {
    vi.mocked(prisma.setlistItem.updateMany).mockResolvedValue({ count: 3 } as never)

    await markSectionPlayed('sl-1', { section: 'MAIN', setNumber: 2 })

    expect(prisma.setlistItem.updateMany).toHaveBeenCalledWith({
      where: {
        setlistId: 'sl-1',
        isActive: true,
        section: 'MAIN',
        setNumber: 2,
      },
      data: { wasPlayed: true },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/setlists/sl-1')
  })

  it('an Encore scope marks only ENCORE items at that set number', async () => {
    vi.mocked(prisma.setlistItem.updateMany).mockResolvedValue({ count: 1 } as never)

    await markSectionPlayed('sl-1', { section: 'ENCORE', setNumber: 1 })

    expect(prisma.setlistItem.updateMany).toHaveBeenCalledWith({
      where: {
        setlistId: 'sl-1',
        isActive: true,
        section: 'ENCORE',
        setNumber: 1,
      },
      data: { wasPlayed: true },
    })
  })

  it('unconditionally overwrites wasPlayed to true regardless of prior value', async () => {
    vi.mocked(prisma.setlistItem.updateMany).mockResolvedValue({ count: 2 } as never)

    await markSectionPlayed('sl-1', 'all')

    const call = vi.mocked(prisma.setlistItem.updateMany).mock.calls[0][0]
    expect(call.data).toEqual({ wasPlayed: true })
    expect(call.where).not.toHaveProperty('wasPlayed')
  })
})

describe('addItem', () => {
  const BAND = '01900000-0000-7000-8000-000000000001'

  function addForm(songId = 'bs-1') {
    const fd = new FormData()
    fd.set('setlistId', 'sl-1')
    fd.set('songId', songId)
    fd.set('section', 'MAIN')
    fd.set('setNumber', '1')
    return fd
  }

  it("adds a song from the band's catalog, writing the BandSong id and the legacy song id", async () => {
    vi.mocked(prisma.bandSong.findFirst).mockResolvedValue({ songId: 'song-1' } as never)
    vi.mocked(prisma.setlistItem.findFirst).mockResolvedValue({ order: 3 } as never)
    vi.mocked(prisma.setlistItem.create).mockResolvedValue({} as never)

    await addItem(addForm())

    expect(prisma.bandSong.findFirst).toHaveBeenCalledWith({
      where: { id: 'bs-1', bandId: BAND, isActive: true },
      select: { songId: true },
    })
    expect(prisma.setlistItem.create).toHaveBeenCalledWith({
      data: { setlistId: 'sl-1', bandSongId: 'bs-1', songId: 'song-1', section: 'MAIN', setNumber: 1, order: 4 },
    })
  })

  it("refuses a song that isn't in the band's active catalog and writes nothing", async () => {
    vi.mocked(prisma.bandSong.findFirst).mockResolvedValue(null)

    await expect(addItem(addForm('other-bands-bs'))).rejects.toBeInstanceOf(NotFoundError)

    expect(prisma.setlistItem.create).not.toHaveBeenCalled()
  })
})

describe('band ownership', () => {
  const BAND = '01900000-0000-7000-8000-000000000001'

  beforeEach(() => {
    vi.mocked(assertOwned).mockRejectedValue(new NotFoundError('setlist'))
  })

  it('addItem rejects another band\'s setlist before reading or writing items', async () => {
    const fd = new FormData()
    fd.set('setlistId', 'foreign-sl')
    fd.set('songId', 'song-1')
    fd.set('section', 'MAIN')
    await expect(addItem(fd)).rejects.toBeInstanceOf(NotFoundError)
    expect(assertOwned).toHaveBeenCalledWith('setlist', BAND, 'foreign-sl')
    expect(prisma.setlistItem.findFirst).not.toHaveBeenCalled()
    expect(prisma.setlistItem.create).not.toHaveBeenCalled()
  })

  it('removeItem rejects another band\'s item', async () => {
    await expect(removeItem('foreign-item')).rejects.toBeInstanceOf(NotFoundError)
    expect(assertOwned).toHaveBeenCalledWith('setlistItem', BAND, 'foreign-item')
    expect(prisma.setlistItem.update).not.toHaveBeenCalled()
  })

  it('moveItem rejects another band\'s item', async () => {
    await expect(moveItem('foreign-item', 'up')).rejects.toBeInstanceOf(NotFoundError)
    expect(prisma.setlistItem.findUnique).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('togglePlayed rejects another band\'s item', async () => {
    await expect(togglePlayed('foreign-item', null)).rejects.toBeInstanceOf(NotFoundError)
    expect(prisma.setlistItem.update).not.toHaveBeenCalled()
  })

  it('reorderItems rejects when any item or the setlist is foreign', async () => {
    await expect(reorderItems('foreign-sl', ['a', 'b'])).rejects.toBeInstanceOf(NotFoundError)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('reorderItems checks every item id against the band', async () => {
    vi.mocked(assertOwned).mockResolvedValue(undefined)
    await reorderItems('sl-1', ['a', 'b'])
    expect(assertOwned).toHaveBeenCalledWith('setlist', BAND, 'sl-1')
    expect(assertOwned).toHaveBeenCalledWith('setlistItem', BAND, 'a', 'b')
  })

  it('moveItemToSection rejects when any dragged item is foreign', async () => {
    await expect(
      moveItemToSection('sl-1', 'a', { section: 'MAIN', setNumber: 1 }, ['a', 'b'], ['c'])
    ).rejects.toBeInstanceOf(NotFoundError)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('markSectionPlayed rejects another band\'s setlist', async () => {
    await expect(markSectionPlayed('foreign-sl', 'all')).rejects.toBeInstanceOf(NotFoundError)
    expect(prisma.setlistItem.updateMany).not.toHaveBeenCalled()
  })

  it('renameSetlist returns "not found" for another band\'s setlist without writing', async () => {
    vi.mocked(isOwned).mockResolvedValue(false)
    const fd = new FormData()
    fd.set('id', 'foreign-sl')
    fd.set('name', 'Hijacked')
    expect(await renameSetlist(null, fd)).toEqual({ error: 'Setlist not found.' })
    expect(isOwned).toHaveBeenCalledWith('setlist', BAND, 'foreign-sl')
    expect(prisma.setlist.update).not.toHaveBeenCalled()
  })
})
