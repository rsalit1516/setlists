import { describe, it, expect } from 'vitest'
import { isGigsView, resolveGigsView } from './gigs-view'

describe('isGigsView', () => {
  it('accepts each known view', () => {
    expect(isGigsView('compact')).toBe(true)
    expect(isGigsView('month')).toBe(true)
    expect(isGigsView('quarter')).toBe(true)
  })

  it('rejects unknown or missing values', () => {
    expect(isGigsView('week')).toBe(false)
    expect(isGigsView(null)).toBe(false)
    expect(isGigsView(undefined)).toBe(false)
    expect(isGigsView('')).toBe(false)
  })
})

describe('resolveGigsView', () => {
  it('prefers a valid URL param over the cookie', () => {
    expect(resolveGigsView('month', 'quarter')).toBe('month')
  })

  it('falls back to the cookie when the URL param is absent', () => {
    expect(resolveGigsView(null, 'quarter')).toBe('quarter')
  })

  it('falls back to the cookie when the URL param is invalid', () => {
    expect(resolveGigsView('bogus', 'month')).toBe('month')
  })

  it('defaults to compact when neither the URL param nor the cookie is valid', () => {
    expect(resolveGigsView(null, null)).toBe('compact')
    expect(resolveGigsView('bogus', 'bogus')).toBe('compact')
  })
})
