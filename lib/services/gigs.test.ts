import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getGigs,
  getGigsInRange,
  hasAnyGigs,
  getGig,
  getGigForPerformance,
  calculateTotalExpenses,
  calculateGigNet,
  deriveMusicianPayoutStatus,
  groupGigsByMonth,
} from './gigs'

vi.mock('@/lib/db', () => ({
  default: {
    gig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

const mockGig = {
  id: 'gig-1',
  date: new Date('2026-05-15'),
  notes: null,
  amountContracted: '800.00',
  amountPaid: null,
  paidAt: null,
  tips: '50.00',
  otherRevenue: null,
  venueId: 'v-1',
  setlistId: 'sl-1',
  venue: { id: 'v-1', name: 'The Jazz Club', address: null, notes: null, createdAt: new Date(), updatedAt: new Date() },
  setlist: { id: 'sl-1', name: 'Friday Night' },
  expenses: [],
  musicians: [
    {
      id: 'm-1',
      musicianId: 'musician-1',
      musician: { id: 'musician-1', name: 'Drummer' },
      amountPaid: '200.00',
      paidAt: null,
      gigId: 'gig-1',
      isActive: true,
      createdAt: new Date('2026-05-15'),
    },
  ],
  createdAt: new Date('2026-05-15'),
  updatedAt: new Date('2026-05-15'),
}

const mockGigSummary = {
  ...mockGig,
  venue: { name: 'The Jazz Club' },
  setlist: { name: 'Friday Night' },
  _count: { musicians: 0 },
}

beforeEach(() => vi.clearAllMocks())

describe('getGigs', () => {
  it('returns gigs ordered by date desc', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([mockGigSummary] as never)
    const result = await getGigs()
    expect(result).toHaveLength(1)
    expect(prisma.gig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { date: 'desc' } })
    )
  })

  it('returns empty array when no gigs exist', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    expect(await getGigs()).toEqual([])
  })

  it('converts tips and otherRevenue to strings', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([mockGigSummary] as never)
    const [result] = await getGigs()
    expect(result.tips).toBe('50.00')
    expect(result.otherRevenue).toBeNull()
  })
})

describe('hasAnyGigs', () => {
  it('returns true when at least one active gig exists', async () => {
    vi.mocked(prisma.gig.count).mockResolvedValue(3)
    expect(await hasAnyGigs()).toBe(true)
  })

  it('returns false when there are no active gigs', async () => {
    vi.mocked(prisma.gig.count).mockResolvedValue(0)
    expect(await hasAnyGigs()).toBe(false)
  })

  it('only counts active gigs', async () => {
    vi.mocked(prisma.gig.count).mockResolvedValue(0)
    await hasAnyGigs()
    expect(prisma.gig.count).toHaveBeenCalledWith({ where: { isActive: true } })
  })
})

describe('getGigsInRange', () => {
  it('queries with a half-open date range and ascending order', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([mockGigSummary] as never)
    const start = new Date(2026, 7, 1)
    const end = new Date(2026, 8, 1)
    const result = await getGigsInRange(start, end)
    expect(result).toHaveLength(1)
    expect(prisma.gig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, date: { gte: start, lt: end } },
        orderBy: { date: 'asc' },
      })
    )
  })

  it('returns empty array when no gigs fall in range', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    expect(await getGigsInRange(new Date(2026, 7, 1), new Date(2026, 8, 1))).toEqual([])
  })

  it('converts tips and otherRevenue to strings', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([mockGigSummary] as never)
    const [result] = await getGigsInRange(new Date(2026, 7, 1), new Date(2026, 8, 1))
    expect(result.tips).toBe('50.00')
    expect(result.otherRevenue).toBeNull()
  })
})

describe('getGig', () => {
  it('returns the gig with details when found', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(mockGig as never)
    const result = await getGig('gig-1')
    expect(result).not.toBeNull()
    expect(result?.id).toBe('gig-1')
    expect(result?.amountContracted).toBe('800.00')
    expect(prisma.gig.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'gig-1' } })
    )
  })

  it('only fetches active (non-removed) setlist items', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(mockGig as never)
    await getGig('gig-1')
    const call = vi.mocked(prisma.gig.findUnique).mock.calls[0][0] as any
    expect(call.include.setlist.include.items.where).toEqual({ isActive: true })
  })

  it('nests the roster musician on each active GigMusician', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(mockGig as never)
    await getGig('gig-1')
    const call = vi.mocked(prisma.gig.findUnique).mock.calls[0][0] as any
    expect(call.include.musicians).toEqual({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      include: { musician: true },
    })
  })

  it('converts tips and otherRevenue to strings', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(mockGig as never)
    const result = await getGig('gig-1')
    expect(result?.tips).toBe('50.00')
    expect(result?.otherRevenue).toBeNull()
    expect(result?.paidAt).toBeNull()
  })

  it('converts each musician amountPaid to a string and passes the roster musician through', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(mockGig as never)
    const result = await getGig('gig-1')
    expect(result?.musicians[0].amountPaid).toBe('200.00')
    expect(result?.musicians[0].musician).toEqual({ id: 'musician-1', name: 'Drummer' })
    expect(result?.musicians[0]).not.toHaveProperty('share')
  })

  it('returns null when gig does not exist', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(null)
    expect(await getGig('nonexistent')).toBeNull()
  })
})

describe('getGigForPerformance', () => {
  const mockPerformanceGig = {
    id: 'gig-1',
    date: new Date('2026-05-15'),
    venue: { name: 'The Jazz Club' },
    setlist: {
      items: [
        {
          id: 'item-1',
          order: 0,
          section: 'MAIN',
          setNumber: 1,
          song: {
            title: 'Friend of the Devil',
            key: 'G',
            lyrics: 'Line one\nLine two',
            chartFileUrl: null,
            chartFileType: null,
          },
        },
      ],
    },
  }

  it('sanitizes each song\'s lyrics into safe HTML, converting legacy plain text', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(mockPerformanceGig as never)
    const result = await getGigForPerformance('gig-1')
    expect(result?.items[0].song.lyrics).toBe('<p>Line one</p><p>Line two</p>')
  })

  it('strips disallowed tags out of previously-stored rich text', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue({
      ...mockPerformanceGig,
      setlist: {
        items: [
          {
            ...mockPerformanceGig.setlist.items[0],
            song: { ...mockPerformanceGig.setlist.items[0].song, lyrics: '<p>Hi <script>alert(1)</script></p>' },
          },
        ],
      },
    } as never)
    const result = await getGigForPerformance('gig-1')
    expect(result?.items[0].song.lyrics).toBe('<p>Hi </p>')
  })

  it('returns null when gig does not exist', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(null)
    expect(await getGigForPerformance('nonexistent')).toBeNull()
  })
})

describe('calculateTotalExpenses', () => {
  it('sums expense amounts', () => {
    expect(calculateTotalExpenses([{ amount: '50.00' }, { amount: '25.50' }])).toBe(75.5)
  })

  it('returns 0 for no expenses', () => {
    expect(calculateTotalExpenses([])).toBe(0)
  })
})

describe('calculateGigNet', () => {
  it('sums amountPaid, tips, and otherRevenue, then subtracts expenses', () => {
    const net = calculateGigNet(
      { amountPaid: '400.00', tips: '50.00', otherRevenue: '10.00' },
      100
    )
    expect(net).toBe(360)
  })

  it('treats null revenue fields as 0', () => {
    const net = calculateGigNet({ amountPaid: null, tips: null, otherRevenue: null }, 20)
    expect(net).toBe(-20)
  })
})

describe('groupGigsByMonth', () => {
  function makeGigSummary(overrides: Partial<typeof mockGigSummary> = {}) {
    return { ...mockGigSummary, ...overrides }
  }

  // Gig dates and `today` are built with the local (year, month, day) constructor —
  // the same shape actions.ts produces via `new Date(dateStr + 'T12:00:00')` — so
  // these tests exercise the same local-getter behavior as production, independent
  // of the test runner's timezone.
  it('returns no groups for an empty gig list', () => {
    expect(groupGigsByMonth([], new Date(2026, 7, 6))).toEqual([])
  })

  it('buckets gigs by month, preserving order within a month', () => {
    const gigs = [
      makeGigSummary({ id: 'g-1', date: new Date(2026, 7, 20) }),
      makeGigSummary({ id: 'g-2', date: new Date(2026, 7, 5) }),
      makeGigSummary({ id: 'g-3', date: new Date(2026, 6, 10) }),
    ]
    const groups = groupGigsByMonth(gigs, new Date(2026, 7, 6))
    expect(groups.map((g) => g.key)).toEqual(['2026-08', '2026-07'])
    expect(groups[0].gigs.map((g) => g.id)).toEqual(['g-1', 'g-2'])
    expect(groups[0].label).toBe('August 2026')
  })

  it('marks the current month expanded by default', () => {
    const gigs = [makeGigSummary({ date: new Date(2026, 7, 20) })]
    const [group] = groupGigsByMonth(gigs, new Date(2026, 7, 6))
    expect(group.defaultExpanded).toBe(true)
  })

  it('collapses next month by default before the 15th', () => {
    const gigs = [makeGigSummary({ date: new Date(2026, 8, 1) })]
    const [group] = groupGigsByMonth(gigs, new Date(2026, 7, 6))
    expect(group.defaultExpanded).toBe(false)
  })

  it('expands next month by default once past the 15th', () => {
    const gigs = [makeGigSummary({ date: new Date(2026, 8, 1) })]
    const [group] = groupGigsByMonth(gigs, new Date(2026, 7, 16))
    expect(group.defaultExpanded).toBe(true)
  })

  it('collapses months beyond next month regardless of date', () => {
    const gigs = [makeGigSummary({ date: new Date(2026, 10, 1) })]
    const [group] = groupGigsByMonth(gigs, new Date(2026, 7, 16))
    expect(group.defaultExpanded).toBe(false)
  })

  it('collapses past months by default', () => {
    const gigs = [makeGigSummary({ date: new Date(2026, 0, 1) })]
    const [group] = groupGigsByMonth(gigs, new Date(2026, 7, 6))
    expect(group.defaultExpanded).toBe(false)
  })
})

describe('deriveMusicianPayoutStatus', () => {
  it('returns null when there are no musicians', () => {
    expect(deriveMusicianPayoutStatus([])).toBeNull()
  })

  it('returns "none" when no musician has been paid', () => {
    expect(deriveMusicianPayoutStatus([{ paidAt: null }, { paidAt: null }])).toBe('none')
  })

  it('returns "some" when only some musicians have been paid', () => {
    expect(deriveMusicianPayoutStatus([{ paidAt: new Date() }, { paidAt: null }])).toBe('some')
  })

  it('returns "all" when every musician has been paid', () => {
    expect(deriveMusicianPayoutStatus([{ paidAt: new Date() }, { paidAt: new Date() }])).toBe('all')
  })
})
