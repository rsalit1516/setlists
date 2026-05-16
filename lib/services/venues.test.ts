import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getVenues, getVenue } from './venues'

vi.mock('@/lib/db', () => ({
  default: {
    venue: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

const mockVenue = {
  id: 'venue-1',
  name: 'The Fillmore',
  address: '1805 Geary Blvd, San Francisco, CA',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe('getVenues', () => {
  it('returns venues ordered by name', async () => {
    vi.mocked(prisma.venue.findMany).mockResolvedValue([mockVenue])
    const result = await getVenues()
    expect(result).toEqual([mockVenue])
    expect(prisma.venue.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } })
  })

  it('returns empty array when no venues exist', async () => {
    vi.mocked(prisma.venue.findMany).mockResolvedValue([])
    expect(await getVenues()).toEqual([])
  })
})

describe('getVenue', () => {
  it('returns the venue when found', async () => {
    vi.mocked(prisma.venue.findUnique).mockResolvedValue(mockVenue)
    const result = await getVenue('venue-1')
    expect(result).toEqual(mockVenue)
    expect(prisma.venue.findUnique).toHaveBeenCalledWith({ where: { id: 'venue-1' } })
  })

  it('returns null when venue does not exist', async () => {
    vi.mocked(prisma.venue.findUnique).mockResolvedValue(null)
    expect(await getVenue('nonexistent')).toBeNull()
  })
})
