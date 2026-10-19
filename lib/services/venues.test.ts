import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getVenues, getVenue } from './venues'

vi.mock('@/lib/db', () => ({
  default: {
    venue: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

const mockVenue = {
  id: 'venue-1',
  name: 'The Fillmore',
  address: '1805 Geary Blvd, San Francisco, CA',
  notes: null,
  bandId: 'band-1',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe('getVenues', () => {
  it("returns the band's active venues ordered by name", async () => {
    vi.mocked(prisma.venue.findMany).mockResolvedValue([mockVenue])
    const result = await getVenues('band-1')
    expect(result).toEqual([mockVenue])
    expect(prisma.venue.findMany).toHaveBeenCalledWith({
      where: { bandId: 'band-1', isActive: true },
      orderBy: { name: 'asc' },
    })
  })

  it('returns empty array when no venues exist', async () => {
    vi.mocked(prisma.venue.findMany).mockResolvedValue([])
    expect(await getVenues('band-1')).toEqual([])
  })
})

describe('getVenue', () => {
  it('returns the venue when found in the band', async () => {
    vi.mocked(prisma.venue.findFirst).mockResolvedValue(mockVenue)
    const result = await getVenue('band-1', 'venue-1')
    expect(result).toEqual(mockVenue)
    expect(prisma.venue.findFirst).toHaveBeenCalledWith({ where: { id: 'venue-1', bandId: 'band-1' } })
  })

  it('returns null when venue does not exist or belongs to another band', async () => {
    vi.mocked(prisma.venue.findFirst).mockResolvedValue(null)
    expect(await getVenue('band-2', 'venue-1')).toBeNull()
    expect(prisma.venue.findFirst).toHaveBeenCalledWith({ where: { id: 'venue-1', bandId: 'band-2' } })
  })
})
