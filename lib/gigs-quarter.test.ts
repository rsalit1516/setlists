import { describe, it, expect } from 'vitest'
import { getQuarterMonths, getQuarterRange, formatQuarterHeading } from './gigs-quarter'

describe('getQuarterMonths', () => {
  it('returns the anchor month plus the next two, normalized to the first', () => {
    expect(getQuarterMonths(new Date(2026, 6, 1))).toEqual([
      new Date(2026, 6, 1),
      new Date(2026, 7, 1),
      new Date(2026, 8, 1),
    ])
  })

  it('crosses a year boundary', () => {
    expect(getQuarterMonths(new Date(2026, 10, 1))).toEqual([
      new Date(2026, 10, 1),
      new Date(2026, 11, 1),
      new Date(2027, 0, 1),
    ])
  })
})

describe('getQuarterRange', () => {
  it('returns a half-open range covering all three months', () => {
    expect(getQuarterRange(new Date(2026, 6, 1))).toEqual({
      start: new Date(2026, 6, 1),
      end: new Date(2026, 9, 1),
    })
  })

  it('crosses a year boundary', () => {
    expect(getQuarterRange(new Date(2026, 10, 1))).toEqual({
      start: new Date(2026, 10, 1),
      end: new Date(2027, 1, 1),
    })
  })
})

describe('formatQuarterHeading', () => {
  it('formats a same-year window with the year once', () => {
    expect(formatQuarterHeading(new Date(2026, 6, 1))).toBe('Jul – Sep 2026')
  })

  it('formats a window crossing a year boundary with both years', () => {
    expect(formatQuarterHeading(new Date(2026, 10, 1))).toBe('Nov 2026 – Jan 2027')
  })
})
