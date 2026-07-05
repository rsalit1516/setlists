import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGigs, getGig } from './gigs'

vi.mock('@/lib/db', () => ({
  default: {
    gig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

const mockGig = {
  id: 'gig-1',
  date: new Date('2026-05-15'),
  notes: null,
  amountContracted: '800.00',
  amountPaid: null,
  venueId: 'v-1',
  setlistId: 'sl-1',
  venue: { id: 'v-1', name: 'The Jazz Club', address: null, notes: null, createdAt: new Date(), updatedAt: new Date() },
  setlist: { id: 'sl-1', name: 'Friday Night' },
  expenses: [],
  musicians: [],
  createdAt: new Date('2026-05-15'),
  updatedAt: new Date('2026-05-15'),
}

const mockGigSummary = {
  ...mockGig,
  venue: { name: 'The Jazz Club' },
  setlist: { name: 'Friday Night' },
  _count: { musicians: 0 },
}

beforeEach(() => vi.clearAllMocks())

describe('getGigs', () => {
  it('returns gigs ordered by date desc', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([mockGigSummary] as never)
    const result = await getGigs()
    expect(result).toHaveLength(1)
    expect(prisma.gig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { date: 'desc' } })
    )
  })

  it('returns empty array when no gigs exist', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    expect(await getGigs()).toEqual([])
  })
})

describe('getGig', () => {
  it('returns the gig with details when found', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(mockGig as never)
    const result = await getGig('gig-1')
    expect(result).not.toBeNull()
    expect(result?.id).toBe('gig-1')
    expect(result?.amountContracted).toBe('800.00')
    expect(prisma.gig.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'gig-1' } })
    )
  })

  it('only fetches active (non-removed) setlist items', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(mockGig as never)
    await getGig('gig-1')
    const call = vi.mocked(prisma.gig.findUnique).mock.calls[0][0] as any
    expect(call.include.setlist.include.items.where).toEqual({ isActive: true })
  })

  it('returns null when gig does not exist', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(null)
    expect(await getGig('nonexistent')).toBeNull()
  })
})
