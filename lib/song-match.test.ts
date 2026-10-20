import { describe, it, expect } from 'vitest'
import { normalizeText, tokens, searchTokens, scoreMatch, isLikelyDuplicate } from './song-match'

describe('normalizeText', () => {
  it('ignores case, punctuation, apostrophes, accents and extra spaces', () => {
    expect(normalizeText("  Don't   Stop Believin'! ")).toBe('dont stop believin')
    expect(normalizeText('Don’t Stop Believin')).toBe('dont stop believin')
    expect(normalizeText('Beyoncé – Halo')).toBe('beyonce halo')
  })

  it('drops a leading "the" so "The Weight" finds "Weight"', () => {
    expect(normalizeText('The Weight')).toBe('weight')
    expect(normalizeText('Weight')).toBe('weight')
  })

  it('treats null and empty as empty', () => {
    expect(normalizeText(null)).toBe('')
    expect(normalizeText(undefined)).toBe('')
    expect(normalizeText('   ')).toBe('')
  })
})

describe('tokens / searchTokens', () => {
  it('splits a normalized title into words', () => {
    expect(tokens("Don't Stop Believin'")).toEqual(['dont', 'stop', 'believin'])
  })

  it('keeps the longest words for the database lookup, dropping short ones and duplicates', () => {
    expect(searchTokens('Go go to the Wonderwall and Wonderwall')).toEqual(['wonderwall'])
    expect(searchTokens("Don't Stop Believin'")).toEqual(['believin', 'dont', 'stop'])
    expect(searchTokens("Don't Stop Believin'", 2)).toHaveLength(2)
  })
})

describe('scoreMatch', () => {
  it('scores an exact normalized title as 1', () => {
    expect(scoreMatch({ title: 'dont stop believin', artist: null }, { title: "Don't Stop Believin'", artist: 'Journey' })).toBe(1)
  })

  it('scores slightly lower when both artists are given and differ', () => {
    expect(
      scoreMatch({ title: 'Hurt', artist: 'Johnny Cash' }, { title: 'Hurt', artist: 'Nine Inch Nails' })
    ).toBe(0.95)
  })

  it('scores partial title overlap by the share of typed words found', () => {
    const all = scoreMatch({ title: 'stop believin', artist: null }, { title: "Don't Stop Believin'", artist: null })
    expect(all).toBeCloseTo(0.9)
    const one = scoreMatch({ title: 'stop wonderwall', artist: null }, { title: "Don't Stop Believin'", artist: null })
    expect(one).toBeCloseTo(0.45)
  })

  it('gives a small boost when the artist agrees, but never reaches an exact 1', () => {
    const without = scoreMatch({ title: 'stop believin', artist: null }, { title: "Don't Stop Believin'", artist: 'Journey' })
    const withArtist = scoreMatch({ title: 'stop believin', artist: 'journey' }, { title: "Don't Stop Believin'", artist: 'Journey' })
    expect(withArtist).toBeGreaterThan(without)
    expect(withArtist).toBeLessThan(1)
  })

  it('scores nothing for an empty query or no overlap', () => {
    expect(scoreMatch({ title: '  ', artist: null }, { title: 'Anything', artist: null })).toBe(0)
    expect(scoreMatch({ title: 'zzz', artist: null }, { title: 'Wonderwall', artist: null })).toBe(0)
  })
})

describe('isLikelyDuplicate', () => {
  it('matches the same title with the same artist, however it is typed', () => {
    expect(
      isLikelyDuplicate({ title: "don't stop believin", artist: 'journey' }, { title: "Don't Stop Believin'", artist: 'Journey' })
    ).toBe(true)
  })

  it('treats a missing artist on either side as possibly the same song', () => {
    expect(isLikelyDuplicate({ title: 'Wonderwall', artist: null }, { title: 'Wonderwall', artist: 'Oasis' })).toBe(true)
    expect(isLikelyDuplicate({ title: 'Wonderwall', artist: 'Oasis' }, { title: 'Wonderwall', artist: null })).toBe(true)
  })

  it('does not match covers by different artists, or different titles', () => {
    expect(isLikelyDuplicate({ title: 'Hurt', artist: 'Johnny Cash' }, { title: 'Hurt', artist: 'Nine Inch Nails' })).toBe(false)
    expect(isLikelyDuplicate({ title: 'Hurt', artist: null }, { title: 'Hurts', artist: null })).toBe(false)
  })

  it('never matches an empty title', () => {
    expect(isLikelyDuplicate({ title: '', artist: null }, { title: '', artist: null })).toBe(false)
  })
})
