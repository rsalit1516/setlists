import { describe, it, expect } from 'vitest'
import { toDateInputValue } from './dates'

describe('toDateInputValue', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(toDateInputValue(new Date(Date.UTC(2026, 7, 16, 12, 0, 0)))).toBe('2026-08-16')
  })

  it('returns an empty string for null', () => {
    expect(toDateInputValue(null)).toBe('')
  })

  it('returns an empty string for undefined', () => {
    expect(toDateInputValue(undefined)).toBe('')
  })
})
