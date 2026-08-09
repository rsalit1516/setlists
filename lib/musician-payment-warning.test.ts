import { describe, it, expect } from 'vitest'
import { musicianPaymentLossWarning } from './musician-payment-warning'

describe('musicianPaymentLossWarning', () => {
  it('returns null when neither amountPaid nor paidAt is set', () => {
    expect(musicianPaymentLossWarning('Jeff Zbar', null, null)).toBeNull()
  })

  it('names the musician, amount, and short date when both are recorded', () => {
    const warning = musicianPaymentLossWarning('Jeff Zbar', '150', new Date('2026-08-03T12:00:00'))
    expect(warning).toBe('Remove Jeff Zbar — $150.00 paid on Aug 3 will be lost.')
  })

  it('omits the date clause when only an amount is recorded', () => {
    const warning = musicianPaymentLossWarning('Jeff Zbar', '150', null)
    expect(warning).toBe('Remove Jeff Zbar — $150.00 paid will be lost.')
  })

  it('omits the amount clause when only a paid date is recorded', () => {
    const warning = musicianPaymentLossWarning('Jeff Zbar', null, new Date('2026-08-03T12:00:00'))
    expect(warning).toBe('Remove Jeff Zbar — Payment on Aug 3 will be lost.')
  })
})
