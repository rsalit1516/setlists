import { describe, it, expect } from 'vitest'
import { isStaleWindowOption, resolveStaleWindow } from './stale-window'

describe('isStaleWindowOption', () => {
  it('accepts each known window', () => {
    expect(isStaleWindowOption('5')).toBe(true)
    expect(isStaleWindowOption('10')).toBe(true)
    expect(isStaleWindowOption('20')).toBe(true)
  })

  it('rejects unknown or missing values', () => {
    expect(isStaleWindowOption('15')).toBe(false)
    expect(isStaleWindowOption(null)).toBe(false)
    expect(isStaleWindowOption(undefined)).toBe(false)
    expect(isStaleWindowOption('')).toBe(false)
  })
})

describe('resolveStaleWindow', () => {
  it('prefers a valid URL param over the cookie', () => {
    expect(resolveStaleWindow('5', '20')).toBe(5)
  })

  it('falls back to the cookie when the URL param is absent', () => {
    expect(resolveStaleWindow(null, '20')).toBe(20)
  })

  it('falls back to the cookie when the URL param is invalid', () => {
    expect(resolveStaleWindow('bogus', '5')).toBe(5)
  })

  it('defaults to 10 when neither the URL param nor the cookie is valid', () => {
    expect(resolveStaleWindow(null, null)).toBe(10)
    expect(resolveStaleWindow('bogus', 'bogus')).toBe(10)
  })

  it('returns a number, not a string', () => {
    expect(resolveStaleWindow('20', null)).toBe(20)
    expect(typeof resolveStaleWindow('20', null)).toBe('number')
  })
})
