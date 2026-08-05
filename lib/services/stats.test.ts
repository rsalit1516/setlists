import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMostPlayedSongs, getReadySongsNeverPlayed } from './stats'

vi.mock('@/lib/db', () => ({
  default: {
    setlistItem: {
      findMany: vi.fn(),
    },
    song: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

type MockSetlistItem = { songId: string }
type MockSong = { id: string; title: string; artist: string | null; key?: string | null }

function makeItem(songId = 'song-1'): MockSetlistItem {
  return { songId }
}

function makeSong(overrides: Partial<MockSong> = {}): MockSong {
  return { id: 'song-1', title: 'Fire on the Mountain', artist: 'Grateful Dead', ...overrides }
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

  it('skips the song lookup entirely when nothing has been played', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    const result = await getMostPlayedSongs()
    expect(result).toEqual([])
    expect(prisma.song.findMany).not.toHaveBeenCalled()
  })

  it('counts one play per matching setlist item, per song', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem('song-1'),
      makeItem('song-1'),
      makeItem('song-2'),
    ] as never)
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1' }),
      makeSong({ id: 'song-2', title: 'Scarlet Begonias' }),
    ] as never)
    const result = await getMostPlayedSongs()
    expect(result.find((s) => s.songId === 'song-1')?.playCount).toBe(2)
    expect(result.find((s) => s.songId === 'song-2')?.playCount).toBe(1)
  })

  it('sorts by play count descending', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem('song-1'),
      makeItem('song-2'),
      makeItem('song-2'),
      makeItem('song-2'),
    ] as never)
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1' }),
      makeSong({ id: 'song-2', title: 'Scarlet Begonias' }),
    ] as never)
    const result = await getMostPlayedSongs()
    expect(result.map((s) => s.songId)).toEqual(['song-2', 'song-1'])
  })

  it('breaks ties by title ascending, for stable ordering', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem('song-z'),
      makeItem('song-a'),
    ] as never)
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-z', title: 'Zzz Song' }),
      makeSong({ id: 'song-a', title: 'Aaa Song' }),
    ] as never)
    const result = await getMostPlayedSongs()
    expect(result.map((s) => s.songId)).toEqual(['song-a', 'song-z'])
  })

  it('respects the limit parameter', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem('song-1'),
      makeItem('song-2'),
      makeItem('song-3'),
    ] as never)
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1', title: 'A' }),
      makeSong({ id: 'song-2', title: 'B' }),
      makeSong({ id: 'song-3', title: 'C' }),
    ] as never)
    const result = await getMostPlayedSongs(2)
    expect(result).toHaveLength(2)
  })

  it('defaults the limit to 10', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue(
      Array.from({ length: 15 }, (_, i) => makeItem(`song-${i}`)) as never
    )
    vi.mocked(prisma.song.findMany).mockResolvedValue(
      Array.from({ length: 15 }, (_, i) => makeSong({ id: `song-${i}`, title: `Song ${i}` })) as never
    )
    const result = await getMostPlayedSongs()
    expect(result).toHaveLength(10)
  })
})

describe('getReadySongsNeverPlayed', () => {
  it('only fetches active READY songs', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    vi.mocked(prisma.song.findMany).mockResolvedValue([])
    await getReadySongsNeverPlayed()
    type FindManyArgs = { where: { isActive: unknown; status: unknown } }
    const call = vi.mocked(prisma.song.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.isActive).toBe(true)
    expect(call.where.status).toBe('READY')
  })

  it('excludes songs that were played at an active gig', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([makeItem('song-1')] as never)
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1', title: 'Played Song' }),
      makeSong({ id: 'song-2', title: 'Never Played Song' }),
    ] as never)
    const result = await getReadySongsNeverPlayed()
    expect(result.map((s) => s.songId)).toEqual(['song-2'])
  })

  it('returns all active READY songs when none have been played', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1', title: 'A' }),
      makeSong({ id: 'song-2', title: 'B' }),
    ] as never)
    const result = await getReadySongsNeverPlayed()
    expect(result).toHaveLength(2)
  })

  it('returns an empty list when every Ready song has been played', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem('song-1'),
      makeItem('song-2'),
    ] as never)
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1' }),
      makeSong({ id: 'song-2' }),
    ] as never)
    const result = await getReadySongsNeverPlayed()
    expect(result).toEqual([])
  })

  it('preserves the alphabetical order returned by getSongs', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-a', title: 'Aaa Song' }),
      makeSong({ id: 'song-z', title: 'Zzz Song' }),
    ] as never)
    const result = await getReadySongsNeverPlayed()
    expect(result.map((s) => s.title)).toEqual(['Aaa Song', 'Zzz Song'])
  })

  it('includes title, artist, and key for each song', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1', title: 'Fire on the Mountain', artist: 'Grateful Dead', key: 'F#m' }),
    ] as never)
    const result = await getReadySongsNeverPlayed()
    expect(result[0]).toEqual({
      songId: 'song-1',
      title: 'Fire on the Mountain',
      artist: 'Grateful Dead',
      key: 'F#m',
    })
  })
})
