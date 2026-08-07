import type { GigsView } from '@/lib/types'

// Kept separate from lib/services/gigs.ts (which has a top-level Prisma
// import) so the /gigs/view route handler — which never touches the DB —
// doesn't pull the Prisma client into its bundle.
export const GIGS_VIEW_COOKIE = 'gigs-view'
const DEFAULT_GIGS_VIEW: GigsView = 'compact'
const GIGS_VIEWS: GigsView[] = ['compact', 'month', 'quarter']

export function isGigsView(value: string | null | undefined): value is GigsView {
  return GIGS_VIEWS.includes(value as GigsView)
}

// The URL always wins over the cookie so a shared/bookmarked link reflects the
// view it names; the cookie only fills in on a fresh visit with no `?view=`.
export function resolveGigsView(
  viewParam: string | null | undefined,
  cookieValue: string | null | undefined
): GigsView {
  if (isGigsView(viewParam)) return viewParam
  if (isGigsView(cookieValue)) return cookieValue
  return DEFAULT_GIGS_VIEW
}
