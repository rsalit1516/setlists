import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFinanceReport, calculateMusicianPayouts } from './finance'

vi.mock('@/lib/db', () => ({
  default: {
    gig: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

type MockGig = {
  id: string
  date: Date
  venue: { name: string }
  amountContracted: string | null
  amountPaid: string | null
  tips: string | null
  otherRevenue: string | null
  expenses: { amount: string }[]
  musicians: { amountPaid: string | null }[]
}

function makeGig(overrides: Partial<MockGig> = {}): MockGig {
  return {
    id: 'gig-1',
    date: new Date('2026-05-15T12:00:00'),
    venue: { name: 'The Jazz Club' },
    amountContracted: '800.00',
    amountPaid: '800.00',
    tips: '50.00',
    otherRevenue: null,
    expenses: [{ amount: '100.00' }],
    musicians: [{ amountPaid: '200.00' }, { amountPaid: '150.00' }],
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('calculateMusicianPayouts', () => {
  it('sums musician amountPaid', () => {
    expect(calculateMusicianPayouts([{ amountPaid: '100.00' }, { amountPaid: '50.00' }])).toBe(150)
  })

  it('treats null amountPaid as 0', () => {
    expect(calculateMusicianPayouts([{ amountPaid: null }, { amountPaid: '50.00' }])).toBe(50)
  })

  it('returns 0 for no musicians', () => {
    expect(calculateMusicianPayouts([])).toBe(0)
  })
})

describe('getFinanceReport', () => {
  it('only fetches active gigs, expenses, and musicians', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([makeGig()] as never)
    await getFinanceReport(new Date('2026-08-05T12:00:00'))
    type FindManyArgs = {
      where: unknown
      include: { expenses: { where: unknown }; musicians: { where: unknown } }
    }
    const call = vi.mocked(prisma.gig.findMany).mock.calls[0][0] as unknown as FindManyArgs
    expect(call.where).toEqual({ isActive: true })
    expect(call.include.expenses.where).toEqual({ isActive: true })
    expect(call.include.musicians.where).toEqual({ isActive: true })
  })

  it('puts a gig from the current year into currentYearGigs, not pastYears', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([makeGig({ date: new Date('2026-03-01T12:00:00') })] as never)
    const report = await getFinanceReport(new Date('2026-08-05T12:00:00'))
    expect(report.currentYear).toBe(2026)
    expect(report.currentYearGigs).toHaveLength(1)
    expect(report.pastYears).toHaveLength(0)
  })

  it('aggregates past-year gigs into one summary row per year', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ id: 'g1', date: new Date('2024-06-01T12:00:00'), amountPaid: '500.00', tips: '20.00' }),
      makeGig({ id: 'g2', date: new Date('2024-09-01T12:00:00'), amountPaid: '300.00', tips: '10.00' }),
      makeGig({ id: 'g3', date: new Date('2025-01-01T12:00:00'), amountPaid: '100.00', tips: '5.00' }),
    ] as never)
    const report = await getFinanceReport(new Date('2026-08-05T12:00:00'))
    expect(report.pastYears).toHaveLength(2)
    const y2024 = report.pastYears.find((y) => y.year === 2024)
    expect(y2024?.gigCount).toBe(2)
    expect(y2024?.totalPaidByVenue).toBe(800)
    expect(y2024?.totalTips).toBe(30)
  })

  it('sorts past years most-recent-first', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({ id: 'g1', date: new Date('2023-06-01T12:00:00') }),
      makeGig({ id: 'g2', date: new Date('2025-06-01T12:00:00') }),
      makeGig({ id: 'g3', date: new Date('2024-06-01T12:00:00') }),
    ] as never)
    const report = await getFinanceReport(new Date('2026-08-05T12:00:00'))
    expect(report.pastYears.map((y) => y.year)).toEqual([2025, 2024, 2023])
  })

  it('computes net as paid + tips + otherRevenue - expenses, excluding musician payouts', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({
        amountPaid: '400.00',
        tips: '50.00',
        otherRevenue: '10.00',
        expenses: [{ amount: '100.00' }],
        musicians: [{ amountPaid: '1000.00' }],
      }),
    ] as never)
    const report = await getFinanceReport(new Date('2026-08-05T12:00:00'))
    expect(report.currentYearGigs[0].net).toBe(360)
    expect(report.currentYearGigs[0].totalMusicianPayouts).toBe(1000)
  })

  it('rolls up current-year gigs into currentYearTotals', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([
      makeGig({
        id: 'g1', date: new Date('2026-01-01T12:00:00'),
        amountPaid: '400.00', tips: '50.00', otherRevenue: null,
        expenses: [{ amount: '100.00' }], musicians: [],
      }),
      makeGig({
        id: 'g2', date: new Date('2026-02-01T12:00:00'),
        amountPaid: '200.00', tips: '0.00', otherRevenue: null,
        expenses: [], musicians: [],
      }),
    ] as never)
    const report = await getFinanceReport(new Date('2026-08-05T12:00:00'))
    expect(report.currentYearTotals.gigCount).toBe(2)
    expect(report.currentYearTotals.totalPaidByVenue).toBe(600)
    expect(report.currentYearTotals.net).toBe(550)
  })

  it('returns empty pastYears/currentYearGigs with zeroed totals when no gigs exist', async () => {
    vi.mocked(prisma.gig.findMany).mockResolvedValue([])
    const report = await getFinanceReport(new Date('2026-08-05T12:00:00'))
    expect(report.pastYears).toEqual([])
    expect(report.currentYearGigs).toEqual([])
    expect(report.currentYearTotals.net).toBe(0)
    expect(report.currentYearTotals.gigCount).toBe(0)
  })
})
