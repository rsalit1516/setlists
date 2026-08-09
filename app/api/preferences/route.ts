import { NextRequest, NextResponse } from 'next/server'
import { GIGS_VIEW_COOKIE, GIGS_VIEWS } from '@/lib/gigs-view'
import { SONGS_STATUS_COOKIE, SONGS_STATUS_FILTERS } from '@/lib/songs-status-filter'

// Plain GET target for filter/view toggle Links across the app: cookies can't
// be set while a Server Component renders, so this route sets a persistence
// cookie and redirects back to the page that linked here. One shared route
// for every persisted filter (#56) instead of each one hand-rolling its own
// (the original was app/gigs/view/route.ts, from #46).
type PreferenceCookieConfig = {
  allowedValues: readonly string[]
  defaultValue: string
}

// Explicit allowlist of cookies this route may set, each with its own valid
// values — this route has no auth in front of it, so both the cookie name and
// its value must come from a small known set, never arbitrary caller input.
// Add an entry here for each new persisted filter (#57, #58, ...).
const PREFERENCE_COOKIES: Record<string, PreferenceCookieConfig> = {
  [GIGS_VIEW_COOKIE]: { allowedValues: GIGS_VIEWS, defaultValue: 'compact' },
  [SONGS_STATUS_COOKIE]: { allowedValues: SONGS_STATUS_FILTERS, defaultValue: 'ALL' },
}

// Same-origin relative paths only — blocks protocol-relative ("//evil.com")
// and backslash ("/\evil.com", which some browsers treat as "//") redirects
// off-site, since this route redirects with no auth in front of it.
function isSafeRedirectPath(path: string | null): path is string {
  if (!path || !path.startsWith('/')) return false
  return !path.startsWith('//') && !path.startsWith('/\\')
}

// A proxy hop can append rather than replace these headers, leaving a
// comma-separated list ("public.example.com, internal-proxy") — the first
// value is the one the original client actually requested.
function firstHeaderValue(headerValue: string | null): string | null {
  if (!headerValue) return null
  return headerValue.split(',')[0]?.trim() || null
}

// Behind Azure Static Web Apps' proxy, request.url/request.nextUrl.origin
// resolve to the container's internal host:port, not the public domain —
// prefer the forwarded headers the proxy sets. Falls back to nextUrl.origin
// for local dev (no proxy in front) and if the forwarded headers are absent
// or malformed, since this route is reachable without auth and shouldn't
// trust them blindly enough to throw or redirect off-site on bad input.
function resolveOrigin(request: NextRequest): string {
  const forwardedHost = firstHeaderValue(request.headers.get('x-forwarded-host'))
  if (!forwardedHost) return request.nextUrl.origin

  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto'))
  const proto = forwardedProto === 'http' || forwardedProto === 'https' ? forwardedProto : 'https'

  try {
    return new URL(`${proto}://${forwardedHost}`).origin
  } catch {
    return request.nextUrl.origin
  }
}

export async function GET(request: NextRequest) {
  const cookieName = request.nextUrl.searchParams.get('cookie')
  const rawValue = request.nextUrl.searchParams.get('value')
  const redirectParam = request.nextUrl.searchParams.get('redirect')

  const config = cookieName ? PREFERENCE_COOKIES[cookieName] : undefined
  if (!cookieName || !config) {
    return NextResponse.json({ error: 'Unknown preference cookie' }, { status: 400 })
  }

  const value = rawValue !== null && config.allowedValues.includes(rawValue) ? rawValue : config.defaultValue
  const redirectPath = isSafeRedirectPath(redirectParam) ? redirectParam : '/'
  const origin = resolveOrigin(request)

  const response = NextResponse.redirect(new URL(redirectPath, origin))
  response.cookies.set(cookieName, value, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    // Read only server-side (Server Components + this route) — httpOnly keeps
    // it out of reach of any client-side script; secure is skipped in dev
    // since the local server runs over plain HTTP.
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
