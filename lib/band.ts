import type { MemberRole } from '@/lib/types'

// Interim: until sign-in exists (#140) every request belongs to the one band created by the
// add_band_tenancy migration. Create actions still read this directly; #131 moves them to
// getBandContext().
export const DEFAULT_BAND_ID = 'band-the-ruminators'

export type BandContext = {
  userId: string | null
  bandId: string
  role: MemberRole
}

// The single seam through which a request learns which band it acts for. #140 replaces the body
// with a session lookup validated against BandMember; callers don't change.
export async function getBandContext(): Promise<BandContext> {
  return { userId: null, bandId: DEFAULT_BAND_ID, role: 'ADMIN' }
}
