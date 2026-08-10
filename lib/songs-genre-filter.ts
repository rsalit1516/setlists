// Genre selections don't fit app/api/preferences/route.ts's allowlist model
// (a small, statically known set of values per cookie) — the set of genre
// ids is dynamic and DB-generated, so this filter gets its own cookie, set by
// the toggleSongsGenreFilter Server Action (app/songs/actions.ts), which
// validates against the live set of active genres instead of a hardcoded
// array. See #69, #72.
export const SONGS_GENRES_COOKIE = 'songs-genres'

export function parseGenreFilterValue(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

// The URL always wins over the cookie so a shared/bookmarked link with an
// explicit ?genres= reflects the selection it names; the cookie only fills
// in on a fresh visit with no ?genres= param. Mirrors resolveSongsStatusFilter.
export function resolveSongsGenreFilter(
  genresParam: string | null | undefined,
  cookieValue: string | null | undefined
): string[] {
  if (genresParam !== null && genresParam !== undefined) return parseGenreFilterValue(genresParam)
  return parseGenreFilterValue(cookieValue)
}

export function toggleGenreId(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((genreId) => genreId !== id) : [...selected, id]
}
