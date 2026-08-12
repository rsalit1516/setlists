import { isKnownPreferenceValue, resolvePreference } from '@/lib/preference-cookie'

// Kept separate from lib/services/stats.ts (which has a top-level Prisma
// import) so the /api/preferences route handler — which never touches the
// DB — doesn't pull the Prisma client into its bundle. Mirrors lib/stale-window.ts.
export const GAP_DAYS_COOKIE = 'stats-gap-days'
export const GAP_LOOKAHEAD_COOKIE = 'stats-gap-lookahead'

// Cookie/URL values are strings; the resolvers below convert the resolved
// option to a number, since that's what getScheduleGaps and the rest of the
// page consume. '14' and '6' mirror DEFAULT_GAP_DAYS and
// DEFAULT_GAP_LOOKAHEAD_MONTHS in lib/services/stats.ts.
export type GapDaysOption = '7' | '14' | '21' | '28'
const DEFAULT_GAP_DAYS: GapDaysOption = '14'
export const GAP_DAYS_OPTIONS: readonly GapDaysOption[] = ['7', '14', '21', '28']

export type GapLookaheadOption = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
const DEFAULT_GAP_LOOKAHEAD: GapLookaheadOption = '6'
export const GAP_LOOKAHEAD_OPTIONS: readonly GapLookaheadOption[] = [
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
]

export function isGapDaysOption(value: string | null | undefined): value is GapDaysOption {
  return isKnownPreferenceValue(value, GAP_DAYS_OPTIONS)
}

export function isGapLookaheadOption(value: string | null | undefined): value is GapLookaheadOption {
  return isKnownPreferenceValue(value, GAP_LOOKAHEAD_OPTIONS)
}

// The URL always wins over the cookie so a shared/bookmarked link with an
// explicit `?gapDays=` reflects the threshold it names; the cookie only fills
// in on a fresh visit with no `?gapDays=` param.
export function resolveGapDays(
  gapDaysParam: string | null | undefined,
  cookieValue: string | null | undefined
): number {
  return Number(resolvePreference(gapDaysParam, cookieValue, GAP_DAYS_OPTIONS, DEFAULT_GAP_DAYS))
}

// Same precedence as resolveGapDays, independent cookie/param so the two
// controls persist and share separately.
export function resolveGapLookaheadMonths(
  gapMonthsParam: string | null | undefined,
  cookieValue: string | null | undefined
): number {
  return Number(
    resolvePreference(gapMonthsParam, cookieValue, GAP_LOOKAHEAD_OPTIONS, DEFAULT_GAP_LOOKAHEAD)
  )
}
