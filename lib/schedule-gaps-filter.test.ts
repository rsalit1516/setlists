import { describe, it, expect } from 'vitest'
import {
  isGapDaysOption,
  isGapLookaheadOption,
  resolveGapDays,
  resolveGapLookaheadMonths,
} from './schedule-gaps-filter'

describe('isGapDaysOption', () => {
  it('accepts each known threshold', () => {
    expect(isGapDaysOption('7')).toBe(true)
    expect(isGapDaysOption('14')).toBe(true)
    expect(isGapDaysOption('21')).toBe(true)
    expect(isGapDaysOption('28')).toBe(true)
  })

  it('rejects unknown or missing values', () => {
    expect(isGapDaysOption('10')).toBe(false)
    expect(isGapDaysOption(null)).toBe(false)
    expect(isGapDaysOption(undefined)).toBe(false)
    expect(isGapDaysOption('')).toBe(false)
  })
})

describe('isGapLookaheadOption', () => {
  it('accepts each known lookahead', () => {
    for (const months of ['3', '4', '5', '6', '7', '8', '9', '10']) {
      expect(isGapLookaheadOption(months)).toBe(true)
    }
  })

  it('rejects unknown or missing values', () => {
    expect(isGapLookaheadOption('2')).toBe(false)
    expect(isGapLookaheadOption('11')).toBe(false)
    expect(isGapLookaheadOption(null)).toBe(false)
    expect(isGapLookaheadOption(undefined)).toBe(false)
    expect(isGapLookaheadOption('')).toBe(false)
  })
})

describe('resolveGapDays', () => {
  it('prefers a valid URL param over the cookie', () => {
    expect(resolveGapDays('7', '28')).toBe(7)
  })

  it('falls back to the cookie when the URL param is absent', () => {
    expect(resolveGapDays(null, '28')).toBe(28)
  })

  it('falls back to the cookie when the URL param is invalid', () => {
    expect(resolveGapDays('bogus', '21')).toBe(21)
  })

  it('defaults to 14 when neither the URL param nor the cookie is valid', () => {
    expect(resolveGapDays(null, null)).toBe(14)
    expect(resolveGapDays('bogus', 'bogus')).toBe(14)
  })

  it('returns a number, not a string', () => {
    expect(resolveGapDays('21', null)).toBe(21)
    expect(typeof resolveGapDays('21', null)).toBe('number')
  })
})

describe('resolveGapLookaheadMonths', () => {
  it('prefers a valid URL param over the cookie', () => {
    expect(resolveGapLookaheadMonths('3', '9')).toBe(3)
  })

  it('falls back to the cookie when the URL param is absent', () => {
    expect(resolveGapLookaheadMonths(null, '9')).toBe(9)
  })

  it('falls back to the cookie when the URL param is invalid', () => {
    expect(resolveGapLookaheadMonths('bogus', '4')).toBe(4)
  })

  it('defaults to 6 when neither the URL param nor the cookie is valid', () => {
    expect(resolveGapLookaheadMonths(null, null)).toBe(6)
    expect(resolveGapLookaheadMonths('bogus', 'bogus')).toBe(6)
  })

  it('returns a number, not a string', () => {
    expect(resolveGapLookaheadMonths('10', null)).toBe(10)
    expect(typeof resolveGapLookaheadMonths('10', null)).toBe('number')
  })

  it('resolves gapDays and lookaheadMonths independently', () => {
    expect(resolveGapDays('28', null)).toBe(28)
    expect(resolveGapLookaheadMonths(null, '3')).toBe(3)
  })
})
