import type { GigsView } from '@/lib/types'
import { isKnownPreferenceValue, resolvePreference } from '@/lib/preference-cookie'

// Kept separate from lib/services/gigs.ts (which has a top-level Prisma
// import) so the /api/preferences route handler — which never touches the
// DB — doesn't pull the Prisma client into its bundle.
export const GIGS_VIEW_COOKIE = 'gigs-view'
const DEFAULT_GIGS_VIEW: GigsView = 'compact'
export const GIGS_VIEWS: readonly GigsView[] = ['compact', 'month', 'quarter']

export function isGigsView(value: string | null | undefined): value is GigsView {
  return isKnownPreferenceValue(value, GIGS_VIEWS)
}

// The URL always wins over the cookie so a shared/bookmarked link reflects the
// view it names; the cookie only fills in on a fresh visit with no `?view=`.
export function resolveGigsView(
  viewParam: string | null | undefined,
  cookieValue: string | null | undefined
): GigsView {
  return resolvePreference(viewParam, cookieValue, GIGS_VIEWS, DEFAULT_GIGS_VIEW)
}
