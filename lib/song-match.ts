type SongText = { title: string; artist: string | null }

// "Don't Stop Believin'" and "dont stop believin" should be the same song to a person typing into a
// search box: lowercase, drop accents, apostrophes and punctuation, collapse spaces, ignore a leading
// "the".
export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '')
}

export function tokens(value: string | null | undefined): string[] {
  const normalized = normalizeText(value)
  return normalized ? normalized.split(' ') : []
}

// The longest few words of a query. These drive the database lookup, because a typo-free long word
// ("believin") matches the stored title even when the apostrophes in it don't match the typed text.
const FILLER_WORDS = new Set(['the', 'and'])

export function searchTokens(title: string, max = 3): string[] {
  return [...new Set(tokens(title).filter((t) => t.length >= 3 && !FILLER_WORDS.has(t)))]
    .sort((a, b) => b.length - a.length)
    .slice(0, max)
}

// 0..1: how much of the typed title is in the candidate's title, nudged up when the artist agrees.
// 1 is an exact (normalized) title match.
export function scoreMatch(query: SongText, candidate: SongText): number {
  const queryTokens = tokens(query.title)
  if (queryTokens.length === 0) return 0

  if (normalizeText(query.title) === normalizeText(candidate.title)) {
    return artistsDisagree(query.artist, candidate.artist) ? 0.95 : 1
  }

  const candidateTokens = new Set(tokens(candidate.title))
  const hits = queryTokens.filter((t) => candidateTokens.has(t)).length
  const base = (hits / queryTokens.length) * 0.9
  return artistsAgree(query.artist, candidate.artist) ? Math.min(base + 0.05, 0.94) : base
}

function artistsAgree(a: string | null, b: string | null): boolean {
  const na = normalizeText(a)
  return na !== '' && na === normalizeText(b)
}

function artistsDisagree(a: string | null, b: string | null): boolean {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  return na !== '' && nb !== '' && na !== nb
}

// Same title, and the artists don't contradict each other (a missing artist counts as "could be the same").
export function isLikelyDuplicate(a: SongText, b: SongText): boolean {
  return normalizeText(a.title) !== '' && normalizeText(a.title) === normalizeText(b.title) && !artistsDisagree(a.artist, b.artist)
}
