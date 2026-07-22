import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSongs, getSong } from './songs'

vi.mock('@/lib/db', () => ({
  default: {
    song: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

const mockSong = {
  id: 'song-1',
  title: 'Friend of the Devil',
  artist: 'Grateful Dead',
  key: 'G',
  singer: 'Alice',
  status: 'READY' as const,
  keyboardRequired: false,
  durationSeconds: 270,
  orientation: 'Dead',
  bpm: 120,
  lyricsUrl: null,
  chartsUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getSongs', () => {
  it('returns songs ordered by title', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([mockSong])
    const result = await getSongs()
    expect(result).toEqual([mockSong])
    expect(prisma.song.findMany).toHaveBeenCalledWith({ where: { isActive: true }, orderBy: { title: 'asc' } })
  })

  it('returns empty array when no songs exist', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([])
    const result = await getSongs()
    expect(result).toEqual([])
  })

  it('filters by status when provided', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([mockSong])
    const result = await getSongs('READY')
    expect(result).toEqual([mockSong])
    expect(prisma.song.findMany).toHaveBeenCalledWith({
      where: { isActive: true, status: 'READY' },
      orderBy: { title: 'asc' },
    })
  })
})

describe('getSong', () => {
  it('returns the song when found', async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue(mockSong)
    const result = await getSong('song-1')
    expect(result).toEqual(mockSong)
    expect(prisma.song.findUnique).toHaveBeenCalledWith({ where: { id: 'song-1' } })
  })

  it('returns null when song does not exist', async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue(null)
    const result = await getSong('nonexistent')
    expect(result).toBeNull()
  })
})
