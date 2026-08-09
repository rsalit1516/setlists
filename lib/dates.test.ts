import { describe, it, expect } from 'vitest'
import { toDateInputValue } from './dates'

describe('toDateInputValue', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(toDateInputValue(new Date('2026-08-16T12:00:00'))).toBe('2026-08-16')
  })

  it('returns an empty string for null', () => {
    expect(toDateInputValue(null)).toBe('')
  })

  it('returns an empty string for undefined', () => {
    expect(toDateInputValue(undefined)).toBe('')
  })
})
