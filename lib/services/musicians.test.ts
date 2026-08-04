import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMusicians, getMusician } from './musicians'

vi.mock('@/lib/db', () => ({
  default: {
    musician: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

const mockMusician = {
  id: 'musician-1',
  name: 'Richard Salit',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe('getMusicians', () => {
  it('returns musicians ordered by name', async () => {
    vi.mocked(prisma.musician.findMany).mockResolvedValue([mockMusician])
    const result = await getMusicians()
    expect(result).toEqual([mockMusician])
    expect(prisma.musician.findMany).toHaveBeenCalledWith({ where: { isActive: true }, orderBy: { name: 'asc' } })
  })

  it('returns empty array when no musicians exist', async () => {
    vi.mocked(prisma.musician.findMany).mockResolvedValue([])
    expect(await getMusicians()).toEqual([])
  })
})

describe('getMusician', () => {
  it('returns the musician when found', async () => {
    vi.mocked(prisma.musician.findUnique).mockResolvedValue(mockMusician)
    const result = await getMusician('musician-1')
    expect(result).toEqual(mockMusician)
    expect(prisma.musician.findUnique).toHaveBeenCalledWith({ where: { id: 'musician-1' } })
  })

  it('returns null when musician does not exist', async () => {
    vi.mocked(prisma.musician.findUnique).mockResolvedValue(null)
    expect(await getMusician('nonexistent')).toBeNull()
  })
})
