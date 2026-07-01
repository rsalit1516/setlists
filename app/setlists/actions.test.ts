import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    setlistItem: {
      update: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.resolve(ops)),
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { reorderItems } from './actions'

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
