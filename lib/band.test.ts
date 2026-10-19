import { describe, it, expect } from 'vitest'
import { getBandContext, DEFAULT_BAND_ID } from './band'

describe('getBandContext', () => {
  it('resolves to the default band with admin rights until sign-in exists', async () => {
    expect(await getBandContext()).toEqual({ userId: null, bandId: DEFAULT_BAND_ID, role: 'ADMIN' })
  })
})
