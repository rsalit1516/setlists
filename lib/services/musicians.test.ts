import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMusicians, getMusician } from './musicians'

vi.mock('@/lib/db', () => ({
  default: {
    musician: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

const mockMusician = {
  id: 'musician-1',
  name: 'Richard Salit',
  bandId: 'band-1',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe('getMusicians', () => {
  it("returns the band's active musicians ordered by name", async () => {
    vi.mocked(prisma.musician.findMany).mockResolvedValue([mockMusician])
    const result = await getMusicians('band-1')
    expect(result).toEqual([mockMusician])
    expect(prisma.musician.findMany).toHaveBeenCalledWith({
      where: { bandId: 'band-1', isActive: true },
      orderBy: { name: 'asc' },
    })
  })

  it('returns empty array when no musicians exist', async () => {
    vi.mocked(prisma.musician.findMany).mockResolvedValue([])
    expect(await getMusicians('band-1')).toEqual([])
  })
})

describe('getMusician', () => {
  it('returns the musician when found in the band', async () => {
    vi.mocked(prisma.musician.findFirst).mockResolvedValue(mockMusician)
    const result = await getMusician('band-1', 'musician-1')
    expect(result).toEqual(mockMusician)
    expect(prisma.musician.findFirst).toHaveBeenCalledWith({ where: { id: 'musician-1', bandId: 'band-1' } })
  })

  it('returns null when musician does not exist or belongs to another band', async () => {
    vi.mocked(prisma.musician.findFirst).mockResolvedValue(null)
    expect(await getMusician('band-2', 'musician-1')).toBeNull()
    expect(prisma.musician.findFirst).toHaveBeenCalledWith({ where: { id: 'musician-1', bandId: 'band-2' } })
  })
})
