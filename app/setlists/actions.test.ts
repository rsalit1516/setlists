import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    setlistItem: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.resolve(ops)),
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { reorderItems, markSectionPlayed, moveItemToSection } from './actions'

beforeEach(() => vi.clearAllMocks())

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
