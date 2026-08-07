import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { GIGS_VIEW_COOKIE } from '@/lib/gigs-view'

describe('GET /gigs/view', () => {
  it('redirects using the forwarded host/proto, not the request URL host', async () => {
    // Regression: behind Azure Static Web Apps' proxy, request.url's host is
    // the internal container host:port, not the public domain.
    const request = new NextRequest('http://internal-container:8080/gigs/view?view=month', {
      headers: {
        'x-forwarded-host': 'proud-ocean-04af2510f.7.azurestaticapps.net',
        'x-forwarded-proto': 'https',
      },
    })

    const response = await GET(request)

    expect(response.headers.get('location')).toBe(
      'https://proud-ocean-04af2510f.7.azurestaticapps.net/gigs?view=month'
    )
  })

  it('falls back to the request URL origin when there is no forwarded host', async () => {
    const request = new NextRequest('http://localhost:3000/gigs/view?view=quarter')

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/gigs?view=quarter')
  })

  it('defaults to compact for an invalid or missing view param', async () => {
    const request = new NextRequest('http://localhost:3000/gigs/view?view=nonsense')

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/gigs?view=compact')
  })

  it('sets the persistence cookie to the resolved view', async () => {
    const request = new NextRequest('http://localhost:3000/gigs/view?view=month')

    const response = await GET(request)

    expect(response.cookies.get(GIGS_VIEW_COOKIE)?.value).toBe('month')
  })
})
