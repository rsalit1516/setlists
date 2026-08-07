import { NextRequest, NextResponse } from 'next/server'
import { GIGS_VIEW_COOKIE, isGigsView } from '@/lib/gigs-view'

// Plain GET target for the view-toggle Links: cookies can't be set while a
// Server Component renders, so this route sets the persistence cookie and
// redirects back to /gigs with the chosen view in the URL.
export async function GET(request: NextRequest) {
  const viewParam = request.nextUrl.searchParams.get('view')
  const view = isGigsView(viewParam) ? viewParam : 'compact'

  const response = NextResponse.redirect(new URL(`/gigs?view=${view}`, request.url))
  response.cookies.set(GIGS_VIEW_COOKIE, view, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    // Read only server-side (Server Component + this route) — httpOnly keeps
    // it out of reach of any client-side script; secure is skipped in dev
    // since the local server runs over plain HTTP.
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
