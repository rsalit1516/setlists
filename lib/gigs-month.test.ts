import { describe, it, expect } from 'vitest'
import { parseMonthParam, formatMonthParam, addMonths, getMonthRange, buildMonthGrid } from './gigs-month'
import type { GigSummary } from '@/lib/types'

const mockGigSummary: GigSummary = {
  id: 'g-1',
  date: new Date(2026, 7, 15),
  notes: null,
  amountContracted: '800.00',
  amountPaid: null,
  paidAt: null,
  tips: null,
  otherRevenue: null,
  venue: { name: 'The Jazz Club' },
  setlist: { name: 'Friday Night' },
  _count: { musicians: 0 },
}

function makeGig(overrides: Partial<GigSummary> = {}): GigSummary {
  return { ...mockGigSummary, ...overrides }
}

describe('parseMonthParam', () => {
  it('parses a valid YYYY-MM into the first of that month', () => {
    const result = parseMonthParam('2026-08')
    expect(result).toEqual(new Date(2026, 7, 1))
  })

  it('returns null for missing input', () => {
    expect(parseMonthParam(null)).toBeNull()
    expect(parseMonthParam(undefined)).toBeNull()
    expect(parseMonthParam('')).toBeNull()
  })

  it('returns null for malformed input', () => {
    expect(parseMonthParam('bogus')).toBeNull()
    expect(parseMonthParam('2026-8')).toBeNull()
    expect(parseMonthParam('2026/08')).toBeNull()
  })

  it('returns null for an out-of-range month', () => {
    expect(parseMonthParam('2026-00')).toBeNull()
    expect(parseMonthParam('2026-13')).toBeNull()
  })
})

describe('formatMonthParam', () => {
  it('formats a date as YYYY-MM', () => {
    expect(formatMonthParam(new Date(2026, 7, 15))).toBe('2026-08')
  })

  it('pads single-digit months', () => {
    expect(formatMonthParam(new Date(2026, 0, 1))).toBe('2026-01')
  })
})

describe('addMonths', () => {
  it('steps forward a month, normalizing to the first', () => {
    expect(addMonths(new Date(2026, 7, 15), 1)).toEqual(new Date(2026, 8, 1))
  })

  it('steps backward a month, crossing a year boundary', () => {
    expect(addMonths(new Date(2026, 0, 15), -1)).toEqual(new Date(2025, 11, 1))
  })
})

describe('getMonthRange', () => {
  it('returns a half-open range covering the whole month', () => {
    expect(getMonthRange(new Date(2026, 7, 15))).toEqual({
      start: new Date(2026, 7, 1),
      end: new Date(2026, 8, 1),
    })
  })
})

describe('buildMonthGrid', () => {
  it('pads the grid to full Sun–Sat weeks around the month', () => {
    // August 2026: Aug 1 is a Saturday, Aug 31 is a Monday.
    const grid = buildMonthGrid(new Date(2026, 7, 1), [])
    expect(grid.length % 7).toBe(0)
    expect(grid[0].date.getDay()).toBe(0)
    expect(grid[grid.length - 1].date.getDay()).toBe(6)
    expect(grid[0].date).toEqual(new Date(2026, 6, 26))
    expect(grid[grid.length - 1].date).toEqual(new Date(2026, 8, 5))
  })

  it('flags in-month vs padding days', () => {
    const grid = buildMonthGrid(new Date(2026, 7, 1), [])
    const aug1 = grid.find((d) => d.date.getTime() === new Date(2026, 7, 1).getTime())
    const jul26 = grid.find((d) => d.date.getTime() === new Date(2026, 6, 26).getTime())
    expect(aug1?.inCurrentMonth).toBe(true)
    expect(jul26?.inCurrentMonth).toBe(false)
  })

  it('assigns each gig to its own day cell', () => {
    const gigs = [makeGig({ id: 'g-1', date: new Date(2026, 7, 15) })]
    const grid = buildMonthGrid(new Date(2026, 7, 1), gigs)
    const cell = grid.find((d) => d.date.getTime() === new Date(2026, 7, 15).getTime())
    expect(cell?.gigs.map((g) => g.id)).toEqual(['g-1'])
  })

  it('stacks multiple gigs into the same day cell', () => {
    const gigs = [
      makeGig({ id: 'g-1', date: new Date(2026, 7, 15) }),
      makeGig({ id: 'g-2', date: new Date(2026, 7, 15) }),
    ]
    const grid = buildMonthGrid(new Date(2026, 7, 1), gigs)
    const cell = grid.find((d) => d.date.getTime() === new Date(2026, 7, 15).getTime())
    expect(cell?.gigs.map((g) => g.id)).toEqual(['g-1', 'g-2'])
  })

  it('leaves gigless days with an empty array', () => {
    const grid = buildMonthGrid(new Date(2026, 7, 1), [])
    expect(grid.every((d) => d.gigs.length === 0)).toBe(true)
  })
})
