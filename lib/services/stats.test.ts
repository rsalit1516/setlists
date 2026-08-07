import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getMostPlayedSongs,
  getReadySongsNeverPlayed,
  getStaleReadySongs,
  DEFAULT_STALE_GIG_WINDOW,
  getStaleInProgressSongs,
  DEFAULT_STALE_DAYS_THRESHOLD,
  getUnpaidGigs,
  getScheduleGaps,
  getNextGapDaysOut,
  DEFAULT_GAP_LOOKAHEAD_MONTHS,
  DEFAULT_GAP_DAYS,
} from './stats'
import type { ScheduleGap } from '@/lib/types'

vi.mock('@/lib/db', () => ({
  default: {
    setlistItem: {
      findMany: vi.fn(),
    },
    song: {
      findMany: vi.fn(),
    },
    gig: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

type MockSetlistItem = { songId: string }
type MockSong = {
  id: string
  title: string
  artist: string | null
  key?: string | null
  updatedAt?: Date
}
type MockGigRow = { setlist: { items: MockSetlistItem[] } }

function makeItem(songId = 'song-1'): MockSetlistItem {
  return { songId }
}

function makeSong(overrides: Partial<MockSong> = {}): MockSong {
  return {
    id: 'song-1',
    title: 'Fire on the Mountain',
    artist: 'Grateful Dead',
    key: null,
    updatedAt: new Date('2026-01-01T12:00:00'),
    ...overrides,
  }
}

// One row per gig, most-recent-first, matching the real orderBy: { date: 'desc' }.
// `playedSongIds` is that gig's played songIds; pass [] for a gig with no matches.
function makeGigs(...playedSongIds: string[][]): MockGigRow[] {
  return playedSongIds.map((songIds) => ({ setlist: { items: songIds.map((songId) => ({ songId })) } }))
}

const NOW = new Date('2026-08-05T12:00:00')
function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)
}
function daysFromNow(n: number): Date {
  return new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000)
}

type MockUpcomingGig = { id: string; date: Date; venue: { name: string } }
function makeUpcomingGig(overrides: Partial<MockUpcomingGig> = {}): MockUpcomingGig {
  return {
    id: 'gig-1',
    date: daysFromNow(5),
    venue: { name: 'The Jazz Club' },
    ...overrides,
  }
}

type MockGig = {
  id: string
  date: Date
  amountContracted: string | null
  amountPaid: string | null
  venue: { name: string }
}

function makeGig(overrides: Partial<MockGig> = {}): MockGig {
  return {
    id: 'gig-1',
    date: new Date('2026-05-15T12:00:00'),
    amountContracted: '800.00',
    amountPaid: null,
    venue: { name: 'The Jazz Club' },
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('getMostPlayedSongs', () => {
  it('only counts active, played setlist items at active gigs', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    await getMostPlayedSongs()
    type FindManyArgs = {
      where: {
        isActive: unknown
        wasPlayed: unknown
        setlist: { gig: { isActive: unknown } }
      }
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

describe('getStaleReadySongs', () => {
  it('only considers active, past gigs, most-recent-first', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    vi.mocked(prisma.song.findMany).mockResolvedValue([])
    await getStaleReadySongs()
    type FindManyArgs = { where: { isActive: unknown; date: { lte: unknown } }; orderBy: { date: unknown } }
    const call = vi.mocked(prisma.gig.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.isActive).toBe(true)
    expect(call.where.date.lte).toBeInstanceOf(Date)
    expect(call.orderBy.date).toBe('desc')
  })

  it('excludes a Ready song played within the window', async () => {
    // 10 gigs (indices 0-9); song-1 played at index 5 — inside the default window of 10.
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      makeGigs([], [], [], [], [], ['song-1'], [], [], [], []) as never
    )
    vi.mocked(prisma.song.findMany).mockResolvedValue([makeSong({ id: 'song-1' })] as never)
    const result = await getStaleReadySongs()
    expect(result).toEqual([])
  })

  it('includes a Ready song last played at or beyond the window boundary', async () => {
    // 11 gigs (indices 0-10); song-1's only play is at index 10 — outside the window of 10.
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      makeGigs([], [], [], [], [], [], [], [], [], [], ['song-1']) as never
    )
    vi.mocked(prisma.song.findMany).mockResolvedValue([makeSong({ id: 'song-1' })] as never)
    const result = await getStaleReadySongs()
    expect(result).toEqual([
      { songId: 'song-1', title: 'Fire on the Mountain', artist: 'Grateful Dead', key: null, gigsSinceLastPlayed: 10 },
    ])
  })

  it('includes a Ready song that has never been played, with gigsSinceLastPlayed null', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue(makeGigs([], []) as never)
    vi.mocked(prisma.song.findMany).mockResolvedValue([makeSong({ id: 'song-1' })] as never)
    const result = await getStaleReadySongs()
    expect(result[0].gigsSinceLastPlayed).toBeNull()
  })

  it('sorts never-played first, then by gigsSinceLastPlayed descending', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      // index 0..14; song-a last played at index 12, song-b at index 15 (never, i.e. absent)
      makeGigs(...Array.from({ length: 13 }, (_, i) => (i === 12 ? ['song-a'] : []))) as never
    )
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-a', title: 'A Song' }),
      makeSong({ id: 'song-b', title: 'B Song' }),
    ] as never)
    const result = await getStaleReadySongs()
    expect(result.map((s) => s.songId)).toEqual(['song-b', 'song-a'])
  })

  it('breaks ties by title ascending when gigsSinceLastPlayed is equal', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      makeGigs(...Array.from({ length: 13 }, (_, i) => (i === 12 ? ['song-z', 'song-a'] : []))) as never
    )
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-z', title: 'Zzz Song' }),
      makeSong({ id: 'song-a', title: 'Aaa Song' }),
    ] as never)
    const result = await getStaleReadySongs()
    expect(result.map((s) => s.songId)).toEqual(['song-a', 'song-z'])
  })

  it('respects a custom gigWindow parameter', async () => {
    // 5 gigs (indices 0-4); song-1 played at index 2 — inside a window of 3, outside a window of 2.
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      makeGigs([], [], ['song-1'], [], []) as never
    )
    vi.mocked(prisma.song.findMany).mockResolvedValue([makeSong({ id: 'song-1' })] as never)
    expect(await getStaleReadySongs(3)).toEqual([])
    expect((await getStaleReadySongs(2))[0]?.songId).toBe('song-1')
  })

  it('defaults gigWindow to DEFAULT_STALE_GIG_WINDOW', async () => {
    expect(DEFAULT_STALE_GIG_WINDOW).toBe(10)
  })
})

describe('getStaleInProgressSongs', () => {
  it('only fetches active IN_PROGRESS songs', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([])
    await getStaleInProgressSongs(DEFAULT_STALE_DAYS_THRESHOLD, NOW)
    type FindManyArgs = { where: { isActive: unknown; status: unknown } }
    const call = vi.mocked(prisma.song.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.isActive).toBe(true)
    expect(call.where.status).toBe('IN_PROGRESS')
  })

  it('excludes a song updated within the threshold', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1', updatedAt: daysAgo(30) }),
    ] as never)
    const result = await getStaleInProgressSongs(60, NOW)
    expect(result).toEqual([])
  })

  it('includes a song updated exactly at the threshold boundary', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1', updatedAt: daysAgo(60) }),
    ] as never)
    const result = await getStaleInProgressSongs(60, NOW)
    expect(result).toHaveLength(1)
    expect(result[0].daysSinceUpdate).toBe(60)
  })

  it('includes a song updated well before the threshold', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1', updatedAt: daysAgo(120) }),
    ] as never)
    const result = await getStaleInProgressSongs(60, NOW)
    expect(result[0].daysSinceUpdate).toBe(120)
  })

  it('sorts oldest-first', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-recent', title: 'Recent', updatedAt: daysAgo(70) }),
      makeSong({ id: 'song-ancient', title: 'Ancient', updatedAt: daysAgo(300) }),
      makeSong({ id: 'song-mid', title: 'Mid', updatedAt: daysAgo(150) }),
    ] as never)
    const result = await getStaleInProgressSongs(60, NOW)
    expect(result.map((s) => s.songId)).toEqual(['song-ancient', 'song-mid', 'song-recent'])
  })

  it('respects a custom daysThreshold', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1', updatedAt: daysAgo(10) }),
    ] as never)
    expect(await getStaleInProgressSongs(30, NOW)).toEqual([])
    const result = await getStaleInProgressSongs(5, NOW)
    expect(result).toHaveLength(1)
  })

  it('defaults daysThreshold to DEFAULT_STALE_DAYS_THRESHOLD', () => {
    expect(DEFAULT_STALE_DAYS_THRESHOLD).toBe(60)
  })

  it('returns an empty list when there are no stale songs', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      makeSong({ id: 'song-1', updatedAt: daysAgo(1) }),
    ] as never)
    const result = await getStaleInProgressSongs(60, NOW)
    expect(result).toEqual([])
  })
})

describe('getUnpaidGigs', () => {
  it('only fetches active past gigs with a contracted amount, oldest-first', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    await getUnpaidGigs(NOW)
    type FindManyArgs = {
      where: { isActive: unknown; date: { lte: unknown }; amountContracted: { not: unknown } }
      orderBy: { date: unknown }
    }
    const call = vi.mocked(prisma.gig.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.isActive).toBe(true)
    expect(call.where.date.lte).toBe(NOW)
    expect(call.where.amountContracted.not).toBeNull()
    expect(call.orderBy.date).toBe('asc')
  })

  it('marks a gig with no payment recorded as unpaid, owing the full amount', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ amountContracted: '800.00', amountPaid: null }),
    ] as never)
    const result = await getUnpaidGigs(NOW)
    expect(result).toEqual([
      {
        id: 'gig-1',
        date: new Date('2026-05-15T12:00:00'),
        venueName: 'The Jazz Club',
        amountContracted: '800.00',
        amountPaid: null,
        outstandingBalance: 800,
        paidStatus: 'unpaid',
      },
    ])
  })

  it('marks a gig with a partial payment as partial, owing the remainder', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ amountContracted: '800.00', amountPaid: '300.00' }),
    ] as never)
    const result = await getUnpaidGigs(NOW)
    expect(result[0].paidStatus).toBe('partial')
    expect(result[0].outstandingBalance).toBe(500)
  })

  it('excludes a gig that has been paid in full', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ amountContracted: '800.00', amountPaid: '800.00' }),
    ] as never)
    const result = await getUnpaidGigs(NOW)
    expect(result).toEqual([])
  })

  it('excludes a gig that has been overpaid', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ amountContracted: '800.00', amountPaid: '900.00' }),
    ] as never)
    const result = await getUnpaidGigs(NOW)
    expect(result).toEqual([])
  })

  it('treats a $0.00 payment the same as no payment (unpaid, not partial)', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ amountContracted: '800.00', amountPaid: '0.00' }),
    ] as never)
    const result = await getUnpaidGigs(NOW)
    expect(result[0].paidStatus).toBe('unpaid')
  })

  it('preserves the oldest-first order returned by the query', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ id: 'gig-old', date: new Date('2026-01-01T12:00:00') }),
      makeGig({ id: 'gig-new', date: new Date('2026-06-01T12:00:00') }),
    ] as never)
    const result = await getUnpaidGigs(NOW)
    expect(result.map((g) => g.id)).toEqual(['gig-old', 'gig-new'])
  })

  it('returns an empty list when nothing is owed', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    const result = await getUnpaidGigs(NOW)
    expect(result).toEqual([])
  })
})

describe('getScheduleGaps', () => {
  it('only fetches active gigs from today through the lookahead window, ascending', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    await getScheduleGaps(1, 14, NOW)
    type FindManyArgs = {
      where: { isActive: unknown; date: { gte: unknown; lte: unknown } }
      orderBy: { date: unknown }
    }
    const call = vi.mocked(prisma.gig.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.isActive).toBe(true)
    expect(call.where.date.gte).toBe(NOW)
    expect(call.where.date.lte).toEqual(new Date('2026-09-05T12:00:00'))
    expect(call.orderBy.date).toBe('asc')
  })

  it('flags an open-ended gap from today when nothing is scheduled at all', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    const result = await getScheduleGaps(1, 14, NOW)
    expect(result).toEqual([{ from: { type: 'today' }, to: { type: 'open' }, days: 31 }])
  })

  it('flags a trailing open-ended gap after the last known gig', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-1', date: daysFromNow(5), venue: { name: 'The Jazz Club' } }),
    ] as never)
    const result = await getScheduleGaps(1, 14, NOW)
    expect(result).toEqual([
      {
        from: { type: 'gig', gigId: 'gig-1', venueName: 'The Jazz Club', date: daysFromNow(5) },
        to: { type: 'open' },
        days: 26,
      },
    ])
  })

  it('flags a gap between two consecutive gigs', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-1', date: daysFromNow(2), venue: { name: 'Venue A' } }),
      makeUpcomingGig({ id: 'gig-2', date: daysFromNow(20), venue: { name: 'Venue B' } }),
    ] as never)
    const result = await getScheduleGaps(1, 14, NOW)
    expect(result).toEqual([
      {
        from: { type: 'gig', gigId: 'gig-1', venueName: 'Venue A', date: daysFromNow(2) },
        to: { type: 'gig', gigId: 'gig-2', venueName: 'Venue B', date: daysFromNow(20) },
        days: 18,
      },
    ])
  })

  it('flags a gap from today to the first gig when it is far out', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-1', date: daysFromNow(20), venue: { name: 'Venue A' } }),
    ] as never)
    const result = await getScheduleGaps(1, 14, NOW)
    expect(result[0]).toEqual({
      from: { type: 'today' },
      to: { type: 'gig', gigId: 'gig-1', venueName: 'Venue A', date: daysFromNow(20) },
      days: 20,
    })
  })

  it('does not flag a gap of exactly gapDays', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-1', date: daysFromNow(5) }),
      makeUpcomingGig({ id: 'gig-2', date: daysFromNow(19) }),
    ] as never)
    const result = await getScheduleGaps(1, 14, NOW)
    expect(result).toEqual([])
  })

  it('flags a gap one day beyond gapDays', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-1', date: daysFromNow(5) }),
      makeUpcomingGig({ id: 'gig-2', date: daysFromNow(20) }),
    ] as never)
    const result = await getScheduleGaps(1, 14, NOW)
    expect(result).toHaveLength(1)
    expect(result[0].days).toBe(15)
  })

  it('returns no gaps when the schedule and trailing stretch are all within gapDays', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-1', date: daysFromNow(5) }),
      makeUpcomingGig({ id: 'gig-2', date: daysFromNow(15) }),
      makeUpcomingGig({ id: 'gig-3', date: daysFromNow(25) }),
    ] as never)
    const result = await getScheduleGaps(1, 14, NOW)
    expect(result).toEqual([])
  })

  it('lists multiple gaps chronologically, including leading and trailing', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-1', date: daysFromNow(20), venue: { name: 'Venue A' } }),
    ] as never)
    // lookaheadMonths=2 -> windowEnd = 61 days out; today->gig=20 (flagged), gig->end=41 (flagged)
    const result = await getScheduleGaps(2, 14, NOW)
    expect(result).toHaveLength(2)
    expect(result[0].from).toEqual({ type: 'today' })
    expect(result[0].to).toMatchObject({ type: 'gig', gigId: 'gig-1' })
    expect(result[1].from).toMatchObject({ type: 'gig', gigId: 'gig-1' })
    expect(result[1].to).toEqual({ type: 'open' })
  })

  it('defaults to DEFAULT_GAP_LOOKAHEAD_MONTHS and DEFAULT_GAP_DAYS', () => {
    expect(DEFAULT_GAP_LOOKAHEAD_MONTHS).toBe(6)
    expect(DEFAULT_GAP_DAYS).toBe(14)
  })
})

describe('getNextGapDaysOut', () => {
  it('returns null when there are no gaps', () => {
    expect(getNextGapDaysOut([], NOW)).toBeNull()
  })

  it('returns 0 when the next gap is already open today', () => {
    const gaps: ScheduleGap[] = [
      { from: { type: 'today' }, to: { type: 'open' }, days: 31 },
    ]
    expect(getNextGapDaysOut(gaps, NOW)).toBe(0)
  })

  it('returns days between now and the gig that precedes the next gap', () => {
    const gaps: ScheduleGap[] = [
      {
        from: { type: 'gig', gigId: 'gig-1', venueName: 'Venue A', date: daysFromNow(5) },
        to: { type: 'open' },
        days: 26,
      },
    ]
    expect(getNextGapDaysOut(gaps, NOW)).toBe(5)
  })

  it('only looks at the earliest gap when several are present', () => {
    const gaps: ScheduleGap[] = [
      {
        from: { type: 'gig', gigId: 'gig-1', venueName: 'Venue A', date: daysFromNow(3) },
        to: { type: 'gig', gigId: 'gig-2', venueName: 'Venue B', date: daysFromNow(20) },
        days: 17,
      },
      {
        from: { type: 'gig', gigId: 'gig-2', venueName: 'Venue B', date: daysFromNow(20) },
        to: { type: 'open' },
        days: 41,
      },
    ]
    expect(getNextGapDaysOut(gaps, NOW)).toBe(3)
  })

  it('defaults now to the real clock when omitted', () => {
    const gaps: ScheduleGap[] = [{ from: { type: 'today' }, to: { type: 'open' }, days: 31 }]
    expect(getNextGapDaysOut(gaps)).toBe(0)
  })
})
