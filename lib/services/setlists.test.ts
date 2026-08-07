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
      expect.objectContaining({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
    )
  })

  it("includes each setlist's linked gig (with venue) so the copy-from picker can show it", async () => {
    const withGig = {
      ...mockSetlist,
      id: 'sl-2',
      gig: { id: 'gig-1', date: new Date('2026-05-20'), venue: { name: 'The Vault' } },
    }
    vi.mocked(prisma.setlist.findMany).mockResolvedValue([withGig] as never)

    const result = await getSetlists()

    expect(result[0].gig).toEqual({
      id: 'gig-1',
      date: new Date('2026-05-20'),
      venue: { name: 'The Vault' },
    })
    expect(prisma.setlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          gig: expect.objectContaining({ include: { venue: true } }),
        }),
      })
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
