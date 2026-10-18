import { describe, it, expect } from 'vitest'
import { expectedAmount } from './gig-money'

const CANCELLED = new Date('2026-10-16T12:00:00')

describe('expectedAmount', () => {
  it('is the contracted amount for a gig that was not cancelled', () => {
    expect(expectedAmount({ cancelledAt: null, cancellationFee: '400.00', amountContracted: '800.00' })).toBe('800.00')
  })

  it('is the cancellation fee for a cancelled gig', () => {
    expect(expectedAmount({ cancelledAt: CANCELLED, cancellationFee: '400.00', amountContracted: '800.00' })).toBe('400.00')
  })

  it('is null for a cancelled gig with no fee, even if a contracted amount exists', () => {
    expect(expectedAmount({ cancelledAt: CANCELLED, cancellationFee: null, amountContracted: '800.00' })).toBeNull()
  })

  it('is null when nothing was contracted', () => {
    expect(expectedAmount({ cancelledAt: null, cancellationFee: null, amountContracted: null })).toBeNull()
  })
})
