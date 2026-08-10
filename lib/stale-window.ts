import { isKnownPreferenceValue, resolvePreference } from '@/lib/preference-cookie'

// Kept separate from lib/services/stats.ts (which has a top-level Prisma
// import) so the /api/preferences route handler — which never touches the
// DB — doesn't pull the Prisma client into its bundle. Mirrors lib/gigs-view.ts.
export const STALE_WINDOW_COOKIE = 'stats-stale-window'

// Cookie/URL values are strings; resolveStaleWindow below converts the
// resolved option to a number, since that's what getStaleReadySongs and the
// rest of the page consume. '10' mirrors DEFAULT_STALE_GIG_WINDOW in
// lib/services/stats.ts.
export type StaleWindowOption = '5' | '10' | '20'
const DEFAULT_STALE_WINDOW: StaleWindowOption = '10'
export const STALE_WINDOW_OPTIONS: readonly StaleWindowOption[] = ['5', '10', '20']

export function isStaleWindowOption(value: string | null | undefined): value is StaleWindowOption {
  return isKnownPreferenceValue(value, STALE_WINDOW_OPTIONS)
}

// The URL always wins over the cookie so a shared/bookmarked link with an
// explicit `?window=` reflects the window it names; the cookie only fills in
// on a fresh visit with no `?window=` param.
export function resolveStaleWindow(
  windowParam: string | null | undefined,
  cookieValue: string | null | undefined
): number {
  return Number(resolvePreference(windowParam, cookieValue, STALE_WINDOW_OPTIONS, DEFAULT_STALE_WINDOW))
}
