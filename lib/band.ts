import type { MemberRole } from '@/lib/types'

// Interim: until sign-in exists (#140) every request belongs to the one band created by the
// add_band_tenancy migration. Create actions still read this directly; #131 moves them to
// getBandContext().
export const DEFAULT_BAND_ID = '01900000-0000-7000-8000-000000000001'

export type BandContext = {
  userId: string | null
  bandId: string
  role: MemberRole
  isPlatformAdmin: boolean
}

// The single seam through which a request learns which band it acts for. #140 replaces the body
// with a session lookup validated against BandMember; callers don't change.
// isPlatformAdmin is stubbed true like the role: it keeps the one existing band able to edit the
// master songs until real platform admins exist (#145).
export async function getBandContext(): Promise<BandContext> {
  return { userId: null, bandId: DEFAULT_BAND_ID, role: 'ADMIN', isPlatformAdmin: true }
}

// A Song row is editable by the band that owns it, or, for a master song (no owner), by a platform admin.
// Everyone else only edits their own BandSong.
export function canEditSong(
  ctx: Pick<BandContext, 'bandId' | 'isPlatformAdmin'>,
  song: { ownerBandId: string | null }
): boolean {
  if (song.ownerBandId === null) return ctx.isPlatformAdmin
  return song.ownerBandId === ctx.bandId
}
