import type { SongStatus } from '@/lib/types'
import { isKnownPreferenceValue, resolvePreference } from '@/lib/preference-cookie'

// Kept separate from lib/services/songs.ts (which has a top-level Prisma
// import) so the /api/preferences route handler — which never touches the
// DB — doesn't pull the Prisma client into its bundle. Mirrors lib/gigs-view.ts.
export const SONGS_STATUS_COOKIE = 'songs-status'

// 'ALL' is a real, selectable filter state (not just "no filter chosen") so
// that clearing the filter persists too, rather than silently falling back
// to whatever status was last picked.
export type SongsStatusFilter = SongStatus | 'ALL'
const DEFAULT_SONGS_STATUS_FILTER: SongsStatusFilter = 'ALL'
export const SONGS_STATUS_FILTERS: readonly SongsStatusFilter[] = [
  'ALL',
  'READY',
  'IN_PROGRESS',
  'WISH',
  'SHELVED',
]

export function isSongsStatusFilter(value: string | null | undefined): value is SongsStatusFilter {
  return isKnownPreferenceValue(value, SONGS_STATUS_FILTERS)
}

// The URL always wins over the cookie so a shared/bookmarked link with an
// explicit `?status=` reflects the status it names; the cookie only fills in
// on a fresh visit with no `?status=` param (e.g. via the top-nav link).
export function resolveSongsStatusFilter(
  statusParam: string | null | undefined,
  cookieValue: string | null | undefined
): SongsStatusFilter {
  return resolvePreference(statusParam, cookieValue, SONGS_STATUS_FILTERS, DEFAULT_SONGS_STATUS_FILTER)
}
