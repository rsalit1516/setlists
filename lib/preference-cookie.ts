// Generic URL-param → cookie → fallback resolution for filters/views that
// need to persist across navigation with no auth/user record to hang a saved
// preference on. Extracted from lib/gigs-view.ts (#46) so #57, #58, and future
// persisted filters share one resolver instead of each hand-rolling their own.

export function isKnownPreferenceValue<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[]
): value is T {
  return allowed.includes(value as T)
}

// The URL always wins over the cookie so a shared/bookmarked link reflects the
// value it names; the cookie only fills in on a fresh visit with no URL param.
export function resolvePreference<T extends string>(
  urlValue: string | null | undefined,
  cookieValue: string | null | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  if (isKnownPreferenceValue(urlValue, allowed)) return urlValue
  if (isKnownPreferenceValue(cookieValue, allowed)) return cookieValue
  return fallback
}
