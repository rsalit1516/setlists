import { describe, it, expect } from 'vitest'
import { isSongsStatusFilter, resolveSongsStatusFilter } from './songs-status-filter'

describe('isSongsStatusFilter', () => {
  it('accepts each known status, including ALL', () => {
    expect(isSongsStatusFilter('ALL')).toBe(true)
    expect(isSongsStatusFilter('READY')).toBe(true)
    expect(isSongsStatusFilter('IN_PROGRESS')).toBe(true)
    expect(isSongsStatusFilter('WISH')).toBe(true)
  })

  it('rejects unknown or missing values', () => {
    expect(isSongsStatusFilter('bogus')).toBe(false)
    expect(isSongsStatusFilter(null)).toBe(false)
    expect(isSongsStatusFilter(undefined)).toBe(false)
    expect(isSongsStatusFilter('')).toBe(false)
  })
})

describe('resolveSongsStatusFilter', () => {
  it('prefers a valid URL param over the cookie', () => {
    expect(resolveSongsStatusFilter('READY', 'WISH')).toBe('READY')
  })

  it('falls back to the cookie when the URL param is absent', () => {
    expect(resolveSongsStatusFilter(null, 'WISH')).toBe('WISH')
  })

  it('falls back to the cookie when the URL param is invalid', () => {
    expect(resolveSongsStatusFilter('bogus', 'READY')).toBe('READY')
  })

  it('defaults to ALL when neither the URL param nor the cookie is valid', () => {
    expect(resolveSongsStatusFilter(null, null)).toBe('ALL')
    expect(resolveSongsStatusFilter('bogus', 'bogus')).toBe('ALL')
  })

  it('treats an explicit ALL URL param as a real selection, not a no-op', () => {
    // Regression: clearing the filter must persist "ALL" rather than falling
    // through to whatever status the cookie last remembered.
    expect(resolveSongsStatusFilter('ALL', 'READY')).toBe('ALL')
  })

  it('remembers a previously-cleared ALL cookie on a fresh visit', () => {
    expect(resolveSongsStatusFilter(null, 'ALL')).toBe('ALL')
  })
})
