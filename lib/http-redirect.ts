import type { NextRequest } from 'next/server'

// Extracted from app/api/preferences/route.ts (#56) so app/api/genre-filter/route.ts
// (#69) can share the same redirect-safety logic instead of re-deriving it.

// Same-origin relative paths only — blocks protocol-relative ("//evil.com")
// and backslash ("/\evil.com", which some browsers treat as "//") redirects
// off-site, since these routes redirect with no auth in front of them.
export function isSafeRedirectPath(path: string | null): path is string {
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
// or malformed, since these routes are reachable without auth and shouldn't
// trust them blindly enough to throw or redirect off-site on bad input.
export function resolveOrigin(request: NextRequest): string {
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
