import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSetlists, getSetlist } from './setlists'

vi.mock('@/lib/db', () => ({
  default: {
    setlist: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

const mockSetlist = {
  id: 'sl-1',
  name: 'Friday Night',
  createdAt: new Date('2026-05-15'),
  updatedAt: new Date('2026-05-15'),
  items: [],
  gig: null,
  _count: { items: 0 },
}

beforeEach(() => vi.clearAllMocks())

describe('getSetlists', () => {
  it('returns setlists ordered by createdAt desc', async () => {
    vi.mocked(prisma.setlist.findMany).mockResolvedValue([mockSetlist] as never)
    const result = await getSetlists()
    expect(result).toHaveLength(1)
    expect(prisma.setlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } })
    )
  })

  it('returns empty array when no setlists exist', async () => {
    vi.mocked(prisma.setlist.findMany).mockResolvedValue([])
    expect(await getSetlists()).toEqual([])
  })
})

describe('getSetlist', () => {
  it('returns the setlist with items when found', async () => {
    vi.mocked(prisma.setlist.findUnique).mockResolvedValue(mockSetlist as never)
    const result = await getSetlist('sl-1')
    expect(result).toEqual(mockSetlist)
    expect(prisma.setlist.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sl-1' } })
    )
  })

  it('returns null when setlist does not exist', async () => {
    vi.mocked(prisma.setlist.findUnique).mockResolvedValue(null)
    expect(await getSetlist('nonexistent')).toBeNull()
  })
})
