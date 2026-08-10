import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGenres, getGenre, getGenresWithSongCounts } from './genres'

vi.mock('@/lib/db', () => ({
  default: {
    genre: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

const mockGenre = {
  id: 'genre-1',
  name: 'Funk',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe('getGenres', () => {
  it('returns active genres ordered by name', async () => {
    vi.mocked(prisma.genre.findMany).mockResolvedValue([mockGenre])
    const result = await getGenres()
    expect(result).toEqual([mockGenre])
    expect(prisma.genre.findMany).toHaveBeenCalledWith({ where: { isActive: true }, orderBy: { name: 'asc' } })
  })

  it('returns empty array when no genres exist', async () => {
    vi.mocked(prisma.genre.findMany).mockResolvedValue([])
    expect(await getGenres()).toEqual([])
  })
})

describe('getGenre', () => {
  it('returns the genre when found', async () => {
    vi.mocked(prisma.genre.findUnique).mockResolvedValue(mockGenre)
    const result = await getGenre('genre-1')
    expect(result).toEqual(mockGenre)
    expect(prisma.genre.findUnique).toHaveBeenCalledWith({ where: { id: 'genre-1' } })
  })

  it('returns null when genre does not exist', async () => {
    vi.mocked(prisma.genre.findUnique).mockResolvedValue(null)
    expect(await getGenre('nonexistent')).toBeNull()
  })
})

describe('getGenresWithSongCounts', () => {
  it('flattens _count.songs into songCount on each genre', async () => {
    vi.mocked(prisma.genre.findMany).mockResolvedValue([{ ...mockGenre, _count: { songs: 4 } }])

    const result = await getGenresWithSongCounts()

    expect(result).toEqual([{ ...mockGenre, songCount: 4 }])
    expect(prisma.genre.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { songs: true } } },
    })
  })

  it('returns empty array when no genres exist', async () => {
    vi.mocked(prisma.genre.findMany).mockResolvedValue([])
    expect(await getGenresWithSongCounts()).toEqual([])
  })
})
