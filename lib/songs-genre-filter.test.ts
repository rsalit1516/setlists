import { describe, it, expect } from 'vitest'
import { parseGenreFilterValue, resolveSongsGenreFilter, toggleGenreId } from './songs-genre-filter'

describe('parseGenreFilterValue', () => {
  it('splits a comma-separated value into ids', () => {
    expect(parseGenreFilterValue('g-1,g-2')).toEqual(['g-1', 'g-2'])
  })

  it('returns an empty array for null, undefined, or empty string', () => {
    expect(parseGenreFilterValue(null)).toEqual([])
    expect(parseGenreFilterValue(undefined)).toEqual([])
    expect(parseGenreFilterValue('')).toEqual([])
  })

  it('drops empty entries from stray commas', () => {
    expect(parseGenreFilterValue('g-1,,g-2,')).toEqual(['g-1', 'g-2'])
  })

  it('trims whitespace around each id, e.g. from a "g-1, g-2" style value', () => {
    expect(parseGenreFilterValue('g-1, g-2')).toEqual(['g-1', 'g-2'])
  })
})

describe('resolveSongsGenreFilter', () => {
  it('prefers the URL param over the cookie when both are present', () => {
    expect(resolveSongsGenreFilter('g-1', 'g-2')).toEqual(['g-1'])
  })

  it('falls back to the cookie when the URL param is absent', () => {
    expect(resolveSongsGenreFilter(undefined, 'g-2')).toEqual(['g-2'])
  })

  it('treats an explicit empty URL param as "no genres selected", not "fall back to cookie"', () => {
    expect(resolveSongsGenreFilter('', 'g-2')).toEqual([])
  })

  it('returns an empty array when neither is present', () => {
    expect(resolveSongsGenreFilter(undefined, undefined)).toEqual([])
  })
})

describe('toggleGenreId', () => {
  it('adds an id not already selected', () => {
    expect(toggleGenreId(['g-1'], 'g-2')).toEqual(['g-1', 'g-2'])
  })

  it('removes an id already selected', () => {
    expect(toggleGenreId(['g-1', 'g-2'], 'g-1')).toEqual(['g-2'])
  })
})
