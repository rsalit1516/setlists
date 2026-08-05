import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMostPlayedSongs } from './stats'

vi.mock('@/lib/db', () => ({
  default: {
    setlistItem: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

type MockSetlistItem = {
  songId: string
  song: { title: string; artist: string | null }
}

function makeItem(overrides: Partial<MockSetlistItem> = {}): MockSetlistItem {
  return {
    songId: 'song-1',
    song: { title: 'Fire on the Mountain', artist: 'Grateful Dead' },
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('getMostPlayedSongs', () => {
  it('only counts active, played setlist items at active gigs', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    await getMostPlayedSongs()
    type FindManyArgs = {
      where: { isActive: unknown; wasPlayed: unknown; setlist: { gig: { isActive: unknown } } }
    }
    const call = vi.mocked(prisma.setlistItem.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.isActive).toBe(true)
    expect(call.where.wasPlayed).toBe(true)
    expect(call.where.setlist.gig.isActive).toBe(true)
  })

  it('counts one play per matching setlist item, per song', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem({ songId: 'song-1' }),
      makeItem({ songId: 'song-1' }),
      makeItem({ songId: 'song-2', song: { title: 'Scarlet Begonias', artist: 'Grateful Dead' } }),
    ] as never)
    const result = await getMostPlayedSongs()
    expect(result.find((s) => s.songId === 'song-1')?.playCount).toBe(2)
    expect(result.find((s) => s.songId === 'song-2')?.playCount).toBe(1)
  })

  it('sorts by play count descending', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem({ songId: 'song-1' }),
      makeItem({ songId: 'song-2', song: { title: 'Scarlet Begonias', artist: null } }),
      makeItem({ songId: 'song-2', song: { title: 'Scarlet Begonias', artist: null } }),
      makeItem({ songId: 'song-2', song: { title: 'Scarlet Begonias', artist: null } }),
    ] as never)
    const result = await getMostPlayedSongs()
    expect(result.map((s) => s.songId)).toEqual(['song-2', 'song-1'])
  })

  it('breaks ties by title ascending, for stable ordering', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem({ songId: 'song-z', song: { title: 'Zzz Song', artist: null } }),
      makeItem({ songId: 'song-a', song: { title: 'Aaa Song', artist: null } }),
    ] as never)
    const result = await getMostPlayedSongs()
    expect(result.map((s) => s.songId)).toEqual(['song-a', 'song-z'])
  })

  it('excludes songs with zero counted plays (returns nothing for an empty result set)', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    const result = await getMostPlayedSongs()
    expect(result).toEqual([])
  })

  it('respects the limit parameter', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem({ songId: 'song-1', song: { title: 'A', artist: null } }),
      makeItem({ songId: 'song-2', song: { title: 'B', artist: null } }),
      makeItem({ songId: 'song-3', song: { title: 'C', artist: null } }),
    ] as never)
    const result = await getMostPlayedSongs(2)
    expect(result).toHaveLength(2)
  })

  it('defaults the limit to 10', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue(
      Array.from({ length: 15 }, (_, i) =>
        makeItem({ songId: `song-${i}`, song: { title: `Song ${i}`, artist: null } })
      ) as never
    )
    const result = await getMostPlayedSongs()
    expect(result).toHaveLength(10)
  })
})
