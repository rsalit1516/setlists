import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { SONGS_GENRES_COOKIE, parseGenreFilterValue } from '@/lib/songs-genre-filter'
import { isSafeRedirectPath, resolveOrigin } from '@/lib/http-redirect'

// Sibling to app/api/preferences/route.ts, split out because that route's
// allowlist model doesn't fit an open, DB-generated set of genre ids (see
// lib/songs-genre-filter.ts). Validates the requested ids against the live
// set of active genres rather than a hardcoded array, so the persisted
// cookie can never hold a genre id that doesn't actually exist.
export async function GET(request: NextRequest) {
  const requestedIds = parseGenreFilterValue(request.nextUrl.searchParams.get('genres'))
  const redirectParam = request.nextUrl.searchParams.get('redirect')

  const validGenres = requestedIds.length
    ? await prisma.genre.findMany({
        where: { id: { in: requestedIds }, isActive: true },
        select: { id: true },
      })
    : []

  const redirectPath = isSafeRedirectPath(redirectParam) ? redirectParam : '/'
  const origin = resolveOrigin(request)

  const response = NextResponse.redirect(new URL(redirectPath, origin))
  response.cookies.set(SONGS_GENRES_COOKIE, validGenres.map((g) => g.id).join(','), {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
