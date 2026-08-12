import { NextRequest, NextResponse } from 'next/server'
import { GIGS_VIEW_COOKIE, GIGS_VIEWS } from '@/lib/gigs-view'
import { SONGS_STATUS_COOKIE, SONGS_STATUS_FILTERS } from '@/lib/songs-status-filter'
import { STALE_WINDOW_COOKIE, STALE_WINDOW_OPTIONS } from '@/lib/stale-window'
import {
  GAP_DAYS_COOKIE,
  GAP_DAYS_OPTIONS,
  GAP_LOOKAHEAD_COOKIE,
  GAP_LOOKAHEAD_OPTIONS,
} from '@/lib/schedule-gaps-filter'
import { isSafeRedirectPath, resolveOrigin } from '@/lib/http-redirect'

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
// Add an entry here for each new persisted filter (#57, #58, #87, ...).
const PREFERENCE_COOKIES: Record<string, PreferenceCookieConfig> = {
  [GIGS_VIEW_COOKIE]: { allowedValues: GIGS_VIEWS, defaultValue: 'compact' },
  [SONGS_STATUS_COOKIE]: { allowedValues: SONGS_STATUS_FILTERS, defaultValue: 'ALL' },
  [STALE_WINDOW_COOKIE]: { allowedValues: STALE_WINDOW_OPTIONS, defaultValue: '10' },
  [GAP_DAYS_COOKIE]: { allowedValues: GAP_DAYS_OPTIONS, defaultValue: '14' },
  [GAP_LOOKAHEAD_COOKIE]: { allowedValues: GAP_LOOKAHEAD_OPTIONS, defaultValue: '6' },
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
