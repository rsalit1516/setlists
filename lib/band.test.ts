import { describe, it, expect } from 'vitest'
import { getBandContext, canEditSong, DEFAULT_BAND_ID } from './band'

describe('getBandContext', () => {
  it('resolves to the default band with admin rights until sign-in exists', async () => {
    expect(await getBandContext()).toEqual({
      userId: null,
      bandId: DEFAULT_BAND_ID,
      role: 'ADMIN',
      isPlatformAdmin: true,
    })
  })
})

describe('canEditSong', () => {
  it('lets a band edit a song it owns, platform admin or not', () => {
    expect(canEditSong({ bandId: 'band-1', isPlatformAdmin: false }, { ownerBandId: 'band-1' })).toBe(true)
  })

  it("never lets a band edit another band's private song, even a platform admin acting for a band", () => {
    expect(canEditSong({ bandId: 'band-1', isPlatformAdmin: false }, { ownerBandId: 'band-2' })).toBe(false)
    expect(canEditSong({ bandId: 'band-1', isPlatformAdmin: true }, { ownerBandId: 'band-2' })).toBe(false)
  })

  it('lets only a platform admin edit a master song (no owner)', () => {
    expect(canEditSong({ bandId: 'band-1', isPlatformAdmin: true }, { ownerBandId: null })).toBe(true)
    expect(canEditSong({ bandId: 'band-1', isPlatformAdmin: false }, { ownerBandId: null })).toBe(false)
  })
})
