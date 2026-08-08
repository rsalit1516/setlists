import { describe, it, expect } from 'vitest'
import { isKnownPreferenceValue, resolvePreference } from './preference-cookie'

const ALLOWED = ['a', 'b', 'c'] as const

describe('isKnownPreferenceValue', () => {
  it('accepts each allowed value', () => {
    expect(isKnownPreferenceValue('a', ALLOWED)).toBe(true)
    expect(isKnownPreferenceValue('b', ALLOWED)).toBe(true)
    expect(isKnownPreferenceValue('c', ALLOWED)).toBe(true)
  })

  it('rejects unknown or missing values', () => {
    expect(isKnownPreferenceValue('z', ALLOWED)).toBe(false)
    expect(isKnownPreferenceValue(null, ALLOWED)).toBe(false)
    expect(isKnownPreferenceValue(undefined, ALLOWED)).toBe(false)
    expect(isKnownPreferenceValue('', ALLOWED)).toBe(false)
  })
})

describe('resolvePreference', () => {
  it('prefers a valid URL value over the cookie', () => {
    expect(resolvePreference('a', 'b', ALLOWED, 'c')).toBe('a')
  })

  it('falls back to the cookie when the URL value is absent', () => {
    expect(resolvePreference(null, 'b', ALLOWED, 'c')).toBe('b')
  })

  it('falls back to the cookie when the URL value is invalid', () => {
    expect(resolvePreference('bogus', 'b', ALLOWED, 'c')).toBe('b')
  })

  it('falls back to the fallback when neither the URL value nor the cookie is valid', () => {
    expect(resolvePreference(null, null, ALLOWED, 'c')).toBe('c')
    expect(resolvePreference('bogus', 'bogus', ALLOWED, 'c')).toBe('c')
    expect(resolvePreference(undefined, undefined, ALLOWED, 'c')).toBe('c')
  })
})
