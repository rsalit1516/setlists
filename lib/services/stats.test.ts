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
    bandSong: {
      findMany: vi.fn(),
    },
    gig: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

// Setlist items carry the BandSong id; the tests keep calling it a "song id" for readability.
type MockSetlistItem = { bandSongId: string }
type MockSong = {
  id: string
  title: string
  artist: string | null
  key?: string | null
  updatedAt?: Date
}
type MockGigRow = { setlist: { items: MockSetlistItem[] } }

function makeItem(songId = 'song-1'): MockSetlistItem {
  return { bandSongId: songId }
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

// What getSongs reads: the band's BandSong rows, each with its generic Song nested.
function mockCatalog(songs: MockSong[]) {
  const rows = songs.map((s) => ({
    id: s.id,
    status: 'READY',
    singer: null,
    keyboardRequired: false,
    isActive: true,
    updatedAt: s.updatedAt,
    song: { title: s.title, artist: s.artist, key: s.key ?? null, isActive: true, updatedAt: s.updatedAt },
  }))
  vi.mocked(prisma.bandSong.findMany).mockResolvedValue(rows as never)
}

// What getMostPlayedSongs reads: BandSong ids with just the title/artist of their Song.
function mockPlayed(songs: MockSong[]) {
  const rows = songs.map((s) => ({ id: s.id, song: { title: s.title, artist: s.artist } }))
  vi.mocked(prisma.bandSong.findMany).mockResolvedValue(rows as never)
}

// One row per gig, most-recent-first, matching the real orderBy: { date: 'desc' }.
// `playedSongIds` is that gig's played songIds; pass [] for a gig with no matches.
// Filler for "a gig that was actually performed" in position-based tests —
// gigs with no played songs are skipped, so a bare [] no longer counts as a gig.
const F = ['filler']

function makeGigs(...playedSongIds: string[][]): MockGigRow[] {
  return playedSongIds.map((songIds) => ({ setlist: { items: songIds.map((bandSongId) => ({ bandSongId })) } }))
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
  cancelledAt: Date | null
  cancellationFee: string | null
  amountPaid: string | null
  venue: { name: string }
}

function makeGig(overrides: Partial<MockGig> = {}): MockGig {
  return {
    id: 'gig-1',
    date: new Date('2026-05-15T12:00:00'),
    amountContracted: '800.00',
    cancelledAt: null,
    cancellationFee: null,
    amountPaid: null,
    venue: { name: 'The Jazz Club' },
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('getMostPlayedSongs', () => {
  it('only counts active, played, non-Soundcheck setlist items at active gigs', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    await getMostPlayedSongs('band-1')
    type FindManyArgs = {
      where: {
        isActive: unknown
        wasPlayed: unknown
        section: unknown
        setlist: { bandId: unknown; gig: { isActive: unknown } }
      }
    }
    const call = vi.mocked(prisma.setlistItem.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.isActive).toBe(true)
    expect(call.where.wasPlayed).toBe(true)
    expect(call.where.section).toEqual({ not: 'SOUNDCHECK' })
    expect(call.where.setlist.gig.isActive).toBe(true)
  })

  it("only counts plays from the given band's setlists", async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    await getMostPlayedSongs('band-2')
    expect(prisma.setlistItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ setlist: expect.objectContaining({ bandId: 'band-2' }) }) })
    )
  })

  it('trusts wasPlayed rather than gig cancellation, so a fully cancelled gig contributes nothing', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    const result = await getMostPlayedSongs('band-1')
    expect(result).toEqual([])
    const call = vi.mocked(prisma.setlistItem.findMany).mock.calls[0][0] as unknown as {
      where: { setlist: { gig: Record<string, unknown> } }
    }
    expect(call.where.setlist.gig).not.toHaveProperty('cancelledAt')
  })

  it('keeps the real plays from a partially played cancelled gig', async () => {
    // The query returns only items marked wasPlayed; a mid-gig rain-out's two
    // played songs count even though the gig has a cancelledAt.
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem('song-1'),
      makeItem('song-2'),
    ] as never)
    mockPlayed([
      makeSong({ id: 'song-1', title: 'A' }),
      makeSong({ id: 'song-2', title: 'B' }),
    ] as never)
    const result = await getMostPlayedSongs('band-1')
    expect(result.map((s) => [s.songId, s.playCount])).toEqual([
      ['song-1', 1],
      ['song-2', 1],
    ])
  })

  it('skips the song lookup entirely when nothing has been played', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    const result = await getMostPlayedSongs('band-1')
    expect(result).toEqual([])
    expect(prisma.bandSong.findMany).not.toHaveBeenCalled()
  })

  it('counts one play per matching setlist item, per song', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem('song-1'),
      makeItem('song-1'),
      makeItem('song-2'),
    ] as never)
    mockPlayed([
      makeSong({ id: 'song-1' }),
      makeSong({ id: 'song-2', title: 'Scarlet Begonias' }),
    ] as never)
    const result = await getMostPlayedSongs('band-1')
    expect(result.find((s) => s.songId === 'song-1')?.playCount).toBe(2)
    expect(result.find((s) => s.songId === 'song-2')?.playCount).toBe(1)
  })

  it('reflects only Main/Encore plays for a song played in mixed sections, since the query already excludes Soundcheck rows', async () => {
    // song-1 was played twice at soundcheck and once at Main — the real DB
    // query's `section: { not: 'SOUNDCHECK' }` filter means only the Main
    // row is ever returned here, so playCount is 1, not 3.
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([makeItem('song-1')] as never)
    mockPlayed([makeSong({ id: 'song-1' })] as never)
    const result = await getMostPlayedSongs('band-1')
    expect(result.find((s) => s.songId === 'song-1')?.playCount).toBe(1)
  })

  it('sorts by play count descending', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem('song-1'),
      makeItem('song-2'),
      makeItem('song-2'),
      makeItem('song-2'),
    ] as never)
    mockPlayed([
      makeSong({ id: 'song-1' }),
      makeSong({ id: 'song-2', title: 'Scarlet Begonias' }),
    ] as never)
    const result = await getMostPlayedSongs('band-1')
    expect(result.map((s) => s.songId)).toEqual(['song-2', 'song-1'])
  })

  it('breaks ties by title ascending, for stable ordering', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem('song-z'),
      makeItem('song-a'),
    ] as never)
    mockPlayed([
      makeSong({ id: 'song-z', title: 'Zzz Song' }),
      makeSong({ id: 'song-a', title: 'Aaa Song' }),
    ] as never)
    const result = await getMostPlayedSongs('band-1')
    expect(result.map((s) => s.songId)).toEqual(['song-a', 'song-z'])
  })

  it('respects the limit parameter', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem('song-1'),
      makeItem('song-2'),
      makeItem('song-3'),
    ] as never)
    mockPlayed([
      makeSong({ id: 'song-1', title: 'A' }),
      makeSong({ id: 'song-2', title: 'B' }),
      makeSong({ id: 'song-3', title: 'C' }),
    ] as never)
    const result = await getMostPlayedSongs('band-1', 2)
    expect(result).toHaveLength(2)
  })

  it('defaults the limit to 10', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue(
      Array.from({ length: 15 }, (_, i) => makeItem(`song-${i}`)) as never
    )
    mockPlayed(
      Array.from({ length: 15 }, (_, i) => makeSong({ id: `song-${i}`, title: `Song ${i}` })) as never
    )
    const result = await getMostPlayedSongs('band-1')
    expect(result).toHaveLength(10)
  })
})

describe('getReadySongsNeverPlayed', () => {
  it("only fetches the band's active READY songs", async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    mockCatalog([])
    await getReadySongsNeverPlayed('band-1')
    type FindManyArgs = { where: { bandId: unknown; isActive: unknown; status: unknown } }
    const call = vi.mocked(prisma.bandSong.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.bandId).toBe('band-1')
    expect(call.where.isActive).toBe(true)
    expect(call.where.status).toBe('READY')
  })

  it('excludes songs that were played at an active gig', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([makeItem('song-1')] as never)
    mockCatalog([
      makeSong({ id: 'song-1', title: 'Played Song' }),
      makeSong({ id: 'song-2', title: 'Never Played Song' }),
    ] as never)
    const result = await getReadySongsNeverPlayed('band-1')
    expect(result.map((s) => s.songId)).toEqual(['song-2'])
  })

  it('returns all active READY songs when none have been played', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    mockCatalog([
      makeSong({ id: 'song-1', title: 'A' }),
      makeSong({ id: 'song-2', title: 'B' }),
    ] as never)
    const result = await getReadySongsNeverPlayed('band-1')
    expect(result).toHaveLength(2)
  })

  it('treats a Ready song only ever played at soundcheck as never played', async () => {
    // song-1's only play was at soundcheck, so the DB-side `section: { not:
    // 'SOUNDCHECK' }` filter means it never shows up in the play-count rows —
    // it should surface here as never played, not be excluded.
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    mockCatalog([
      makeSong({ id: 'song-1', title: 'Soundcheck Only' }),
    ] as never)
    const result = await getReadySongsNeverPlayed('band-1')
    expect(result.map((s) => s.songId)).toEqual(['song-1'])
  })

  it('returns an empty list when every Ready song has been played', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([
      makeItem('song-1'),
      makeItem('song-2'),
    ] as never)
    mockCatalog([
      makeSong({ id: 'song-1' }),
      makeSong({ id: 'song-2' }),
    ] as never)
    const result = await getReadySongsNeverPlayed('band-1')
    expect(result).toEqual([])
  })

  it('preserves the alphabetical order returned by getSongs', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    mockCatalog([
      makeSong({ id: 'song-a', title: 'Aaa Song' }),
      makeSong({ id: 'song-z', title: 'Zzz Song' }),
    ] as never)
    const result = await getReadySongsNeverPlayed('band-1')
    expect(result.map((s) => s.title)).toEqual(['Aaa Song', 'Zzz Song'])
  })

  it('includes title, artist, and key for each song', async () => {
    vi.mocked(prisma.setlistItem.findMany).mockResolvedValue([])
    mockCatalog([
      makeSong({ id: 'song-1', title: 'Fire on the Mountain', artist: 'Grateful Dead', key: 'F#m' }),
    ] as never)
    const result = await getReadySongsNeverPlayed('band-1')
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
    mockCatalog([])
    await getStaleReadySongs('band-1')
    type FindManyArgs = { where: { bandId: unknown; isActive: unknown; date: { lte: unknown } }; orderBy: { date: unknown } }
    const call = vi.mocked(prisma.gig.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.bandId).toBe('band-1')
    expect(call.where.isActive).toBe(true)
    expect(call.where.date.lte).toBeInstanceOf(Date)
    expect(call.orderBy.date).toBe('desc')
  })

  it('only considers active, played, non-Soundcheck setlist items when computing last-played', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    mockCatalog([])
    await getStaleReadySongs('band-1')
    type FindManyArgs = {
      select: {
        setlist: { select: { items: { where: { isActive: unknown; wasPlayed: unknown; section: unknown } } } }
      }
    }
    const call = vi.mocked(prisma.gig.findMany).mock.calls[0][0] as unknown as FindManyArgs
    const itemsWhere = call.select.setlist.select.items.where
    expect(itemsWhere.isActive).toBe(true)
    expect(itemsWhere.wasPlayed).toBe(true)
    expect(itemsWhere.section).toEqual({ not: 'SOUNDCHECK' })
  })

  it('treats a Ready song only ever played at soundcheck as never played (gigsSinceLastPlayed null)', async () => {
    // The real query's `section: { not: 'SOUNDCHECK' }` filter means a
    // soundcheck-only play never appears in a gig's items here — same shape
    // as a song that was never played at all.
    vi.mocked(prisma.gig.findMany).mockResolvedValue(makeGigs([], []) as never)
    mockCatalog([makeSong({ id: 'song-1' })] as never)
    const result = await getStaleReadySongs('band-1')
    expect(result[0].gigsSinceLastPlayed).toBeNull()
  })

  it('excludes a Ready song played within the window', async () => {
    // 10 gigs (indices 0-9); song-1 played at index 5 — inside the default window of 10.
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      makeGigs(F, F, F, F, F, ['song-1'], F, F, F, F) as never
    )
    mockCatalog([makeSong({ id: 'song-1' })] as never)
    const result = await getStaleReadySongs('band-1')
    expect(result).toEqual([])
  })

  it('includes a Ready song last played at or beyond the window boundary', async () => {
    // 11 gigs (indices 0-10); song-1's only play is at index 10 — outside the window of 10.
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      makeGigs(F, F, F, F, F, F, F, F, F, F, ['song-1']) as never
    )
    mockCatalog([makeSong({ id: 'song-1' })] as never)
    const result = await getStaleReadySongs('band-1')
    expect(result).toEqual([
      { songId: 'song-1', title: 'Fire on the Mountain', artist: 'Grateful Dead', key: null, gigsSinceLastPlayed: 10 },
    ])
  })

  it('includes a Ready song that has never been played, with gigsSinceLastPlayed null', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue(makeGigs([], []) as never)
    mockCatalog([makeSong({ id: 'song-1' })] as never)
    const result = await getStaleReadySongs('band-1')
    expect(result[0].gigsSinceLastPlayed).toBeNull()
  })

  it('sorts never-played first, then by gigsSinceLastPlayed descending', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      // index 0..14; song-a last played at index 12, song-b at index 15 (never, i.e. absent)
      makeGigs(...Array.from({ length: 13 }, (_, i) => (i === 12 ? ['song-a'] : F))) as never
    )
    mockCatalog([
      makeSong({ id: 'song-a', title: 'A Song' }),
      makeSong({ id: 'song-b', title: 'B Song' }),
    ] as never)
    const result = await getStaleReadySongs('band-1')
    expect(result.map((s) => s.songId)).toEqual(['song-b', 'song-a'])
  })

  it('breaks ties by title ascending when gigsSinceLastPlayed is equal', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      makeGigs(...Array.from({ length: 13 }, (_, i) => (i === 12 ? ['song-z', 'song-a'] : F))) as never
    )
    mockCatalog([
      makeSong({ id: 'song-z', title: 'Zzz Song' }),
      makeSong({ id: 'song-a', title: 'Aaa Song' }),
    ] as never)
    const result = await getStaleReadySongs('band-1')
    expect(result.map((s) => s.songId)).toEqual(['song-a', 'song-z'])
  })

  it('respects a custom gigWindow parameter', async () => {
    // 5 gigs (indices 0-4); song-1 played at index 2 — inside a window of 3, outside a window of 2.
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      makeGigs(F, F, ['song-1'], F, F) as never
    )
    mockCatalog([makeSong({ id: 'song-1' })] as never)
    expect(await getStaleReadySongs('band-1', 3)).toEqual([])
    expect((await getStaleReadySongs('band-1', 2))[0]?.songId).toBe('song-1')
  })

  it('skips gigs with no played songs (cancelled / rained out) when counting gigs since last played', async () => {
    // Raw positions: song-1 at index 12. Only 2 of the 12 gigs before it were
    // actually performed, so it is 2 performed gigs back, not 12 — inside the window.
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      makeGigs([], [], [], [], F, [], [], [], [], [], [], F, ['song-1']) as never
    )
    mockCatalog([makeSong({ id: 'song-1' })] as never)
    expect(await getStaleReadySongs('band-1')).toEqual([])
    expect((await getStaleReadySongs('band-1', 2))[0]).toMatchObject({ songId: 'song-1', gigsSinceLastPlayed: 2 })
  })

  it('keeps the plays from a partially played cancelled gig in the sequence', async () => {
    // A mid-gig rain-out that still has one played song is a real (short) gig.
    vi.mocked(prisma.gig.findMany).mockResolvedValue(
      makeGigs(['song-2'], ['song-1']) as never
    )
    mockCatalog([makeSong({ id: 'song-1' })] as never)
    expect((await getStaleReadySongs('band-1', 1))[0]).toMatchObject({ songId: 'song-1', gigsSinceLastPlayed: 1 })
  })

  it('defaults gigWindow to DEFAULT_STALE_GIG_WINDOW', async () => {
    expect(DEFAULT_STALE_GIG_WINDOW).toBe(10)
  })
})

describe('getStaleInProgressSongs', () => {
  it("only fetches the band's active IN_PROGRESS songs", async () => {
    mockCatalog([])
    await getStaleInProgressSongs('band-1', DEFAULT_STALE_DAYS_THRESHOLD, NOW)
    type FindManyArgs = { where: { bandId: unknown; isActive: unknown; status: unknown } }
    const call = vi.mocked(prisma.bandSong.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.bandId).toBe('band-1')
    expect(call.where.isActive).toBe(true)
    expect(call.where.status).toBe('IN_PROGRESS')
  })

  it('excludes a song updated within the threshold', async () => {
    mockCatalog([
      makeSong({ id: 'song-1', updatedAt: daysAgo(30) }),
    ] as never)
    const result = await getStaleInProgressSongs('band-1', 60, NOW)
    expect(result).toEqual([])
  })

  it('includes a song updated exactly at the threshold boundary', async () => {
    mockCatalog([
      makeSong({ id: 'song-1', updatedAt: daysAgo(60) }),
    ] as never)
    const result = await getStaleInProgressSongs('band-1', 60, NOW)
    expect(result).toHaveLength(1)
    expect(result[0].daysSinceUpdate).toBe(60)
  })

  it('includes a song updated well before the threshold', async () => {
    mockCatalog([
      makeSong({ id: 'song-1', updatedAt: daysAgo(120) }),
    ] as never)
    const result = await getStaleInProgressSongs('band-1', 60, NOW)
    expect(result[0].daysSinceUpdate).toBe(120)
  })

  it('sorts oldest-first', async () => {
    mockCatalog([
      makeSong({ id: 'song-recent', title: 'Recent', updatedAt: daysAgo(70) }),
      makeSong({ id: 'song-ancient', title: 'Ancient', updatedAt: daysAgo(300) }),
      makeSong({ id: 'song-mid', title: 'Mid', updatedAt: daysAgo(150) }),
    ] as never)
    const result = await getStaleInProgressSongs('band-1', 60, NOW)
    expect(result.map((s) => s.songId)).toEqual(['song-ancient', 'song-mid', 'song-recent'])
  })

  it('respects a custom daysThreshold', async () => {
    mockCatalog([
      makeSong({ id: 'song-1', updatedAt: daysAgo(10) }),
    ] as never)
    expect(await getStaleInProgressSongs('band-1', 30, NOW)).toEqual([])
    const result = await getStaleInProgressSongs('band-1', 5, NOW)
    expect(result).toHaveLength(1)
  })

  it('defaults daysThreshold to DEFAULT_STALE_DAYS_THRESHOLD', () => {
    expect(DEFAULT_STALE_DAYS_THRESHOLD).toBe(60)
  })

  it('returns an empty list when there are no stale songs', async () => {
    mockCatalog([
      makeSong({ id: 'song-1', updatedAt: daysAgo(1) }),
    ] as never)
    const result = await getStaleInProgressSongs('band-1', 60, NOW)
    expect(result).toEqual([])
  })
})

describe('getUnpaidGigs', () => {
  it('only fetches active past gigs with a contracted amount or cancellation fee, oldest-first', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    await getUnpaidGigs('band-1', NOW)
    type FindManyArgs = {
      where: { bandId: unknown; isActive: unknown; date: { lte: unknown }; OR: unknown }
      orderBy: { date: unknown }
    }
    const call = vi.mocked(prisma.gig.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.bandId).toBe('band-1')
    expect(call.where.isActive).toBe(true)
    expect(call.where.date.lte).toBe(NOW)
    expect(call.where.OR).toEqual([{ amountContracted: { not: null } }, { cancellationFee: { not: null } }])
    expect(call.orderBy.date).toBe('asc')
  })

  it('marks a gig with no payment recorded as unpaid, owing the full amount', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ amountContracted: '800.00', amountPaid: null }),
    ] as never)
    const result = await getUnpaidGigs('band-1', NOW)
    expect(result).toEqual([
      {
        id: 'gig-1',
        date: new Date('2026-05-15T12:00:00'),
        venueName: 'The Jazz Club',
        expectedAmount: '800.00',
        isCancelled: false,
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
    const result = await getUnpaidGigs('band-1', NOW)
    expect(result[0].paidStatus).toBe('partial')
    expect(result[0].outstandingBalance).toBe(500)
  })

  it('excludes a gig that has been paid in full', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ amountContracted: '800.00', amountPaid: '800.00' }),
    ] as never)
    const result = await getUnpaidGigs('band-1', NOW)
    expect(result).toEqual([])
  })

  it('excludes a gig that has been overpaid', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ amountContracted: '800.00', amountPaid: '900.00' }),
    ] as never)
    const result = await getUnpaidGigs('band-1', NOW)
    expect(result).toEqual([])
  })

  it('treats a $0.00 payment the same as no payment (unpaid, not partial)', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ amountContracted: '800.00', amountPaid: '0.00' }),
    ] as never)
    const result = await getUnpaidGigs('band-1', NOW)
    expect(result[0].paidStatus).toBe('unpaid')
  })

  it('preserves the oldest-first order returned by the query', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ id: 'gig-old', date: new Date('2026-01-01T12:00:00') }),
      makeGig({ id: 'gig-new', date: new Date('2026-06-01T12:00:00') }),
    ] as never)
    const result = await getUnpaidGigs('band-1', NOW)
    expect(result.map((g) => g.id)).toEqual(['gig-old', 'gig-new'])
  })

  it('owes the cancellation fee, not the contracted amount, for a cancelled gig', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ amountContracted: '800.00', cancelledAt: new Date('2026-05-15T12:00:00'), cancellationFee: '400.00' }),
    ] as never)
    const result = await getUnpaidGigs('band-1', NOW)
    expect(result).toHaveLength(1)
    expect(result[0].expectedAmount).toBe('400.00')
    expect(result[0].isCancelled).toBe(true)
    expect(result[0].outstandingBalance).toBe(400)
    expect(result[0].paidStatus).toBe('unpaid')
  })

  it('excludes a cancelled gig whose fee has been received', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ cancelledAt: new Date('2026-05-15T12:00:00'), cancellationFee: '400.00', amountPaid: '400.00' }),
    ] as never)
    expect(await getUnpaidGigs('band-1', NOW)).toEqual([])
  })

  it('never lists a cancelled gig with no fee, even if it has a contracted amount', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ amountContracted: '800.00', cancelledAt: new Date('2026-05-15T12:00:00'), cancellationFee: null }),
    ] as never)
    expect(await getUnpaidGigs('band-1', NOW)).toEqual([])
  })

  it('returns an empty list when nothing is owed', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    const result = await getUnpaidGigs('band-1', NOW)
    expect(result).toEqual([])
  })
})

describe('getScheduleGaps', () => {
  it('only fetches active gigs from today through the lookahead window, ascending', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    await getScheduleGaps('band-1', 1, 14, NOW)
    type FindManyArgs = {
      where: { bandId: unknown; isActive: unknown; date: { gte: unknown; lte: unknown } }
      orderBy: { date: unknown }
    }
    const call = vi.mocked(prisma.gig.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.bandId).toBe('band-1')
    expect(call.where.isActive).toBe(true)
    expect(call.where.date.gte).toBe(NOW)
    expect(call.where.date.lte).toEqual(new Date('2026-09-05T12:00:00'))
    expect(call.orderBy.date).toBe('asc')
  })

  it('excludes cancelled gigs so they cannot hide an open stretch of calendar', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    await getScheduleGaps('band-1', 1, 14, NOW)
    type FindManyArgs = { where: { cancelledAt: unknown } }
    const call = vi.mocked(prisma.gig.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where.cancelledAt).toBeNull()
  })

  it('reports the gap a cancelled gig would have covered once it is filtered out', async () => {
    // A cancelled gig at +10 days is dropped by the query, leaving only the +30 gig.
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-2', date: daysFromNow(30), venue: { name: 'Venue B' } }),
    ] as never)
    const result = await getScheduleGaps('band-1', 2, 14, NOW)
    expect(result[0]).toEqual({
      from: { type: 'today' },
      to: { type: 'gig', gigId: 'gig-2', venueName: 'Venue B', date: daysFromNow(30) },
      days: 30,
    })
  })

  it('flags an open-ended gap from today when nothing is scheduled at all', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    const result = await getScheduleGaps('band-1', 1, 14, NOW)
    expect(result).toEqual([{ from: { type: 'today' }, to: { type: 'open' }, days: 31 }])
  })

  it('flags a trailing open-ended gap after the last known gig', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-1', date: daysFromNow(5), venue: { name: 'The Jazz Club' } }),
    ] as never)
    const result = await getScheduleGaps('band-1', 1, 14, NOW)
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
    const result = await getScheduleGaps('band-1', 1, 14, NOW)
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
    const result = await getScheduleGaps('band-1', 1, 14, NOW)
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
    const result = await getScheduleGaps('band-1', 1, 14, NOW)
    expect(result).toEqual([])
  })

  it('flags a gap one day beyond gapDays', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-1', date: daysFromNow(5) }),
      makeUpcomingGig({ id: 'gig-2', date: daysFromNow(20) }),
    ] as never)
    const result = await getScheduleGaps('band-1', 1, 14, NOW)
    expect(result).toHaveLength(1)
    expect(result[0].days).toBe(15)
  })

  it('returns no gaps when the schedule and trailing stretch are all within gapDays', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-1', date: daysFromNow(5) }),
      makeUpcomingGig({ id: 'gig-2', date: daysFromNow(15) }),
      makeUpcomingGig({ id: 'gig-3', date: daysFromNow(25) }),
    ] as never)
    const result = await getScheduleGaps('band-1', 1, 14, NOW)
    expect(result).toEqual([])
  })

  it('lists multiple gaps chronologically, including leading and trailing', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeUpcomingGig({ id: 'gig-1', date: daysFromNow(20), venue: { name: 'Venue A' } }),
    ] as never)
    // lookaheadMonths=2 -> windowEnd = 61 days out; today->gig=20 (flagged), gig->end=41 (flagged)
    const result = await getScheduleGaps('band-1', 2, 14, NOW)
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
