import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { GIGS_VIEW_COOKIE } from '@/lib/gigs-view'

function makeRequest(url: string, headers?: Record<string, string>) {
  return new NextRequest(url, headers ? { headers } : undefined)
}

describe('GET /api/preferences', () => {
  it('redirects using the forwarded host/proto, not the request URL host', async () => {
    // Regression: behind Azure Static Web Apps' proxy, request.url's host is
    // the internal container host:port, not the public domain.
    const request = makeRequest(
      'http://internal-container:8080/api/preferences?cookie=gigs-view&value=month&redirect=%2Fgigs%3Fview%3Dmonth',
      {
        'x-forwarded-host': 'proud-ocean-04af2510f.7.azurestaticapps.net',
        'x-forwarded-proto': 'https',
      }
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe(
      'https://proud-ocean-04af2510f.7.azurestaticapps.net/gigs?view=month'
    )
  })

  it('falls back to the request URL origin when there is no forwarded host', async () => {
    const request = makeRequest(
      'http://localhost:3000/api/preferences?cookie=gigs-view&value=quarter&redirect=%2Fgigs%3Fview%3Dquarter'
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/gigs?view=quarter')
  })

  it('sets the persistence cookie to the resolved value', async () => {
    const request = makeRequest(
      'http://localhost:3000/api/preferences?cookie=gigs-view&value=month&redirect=%2Fgigs%3Fview%3Dmonth'
    )

    const response = await GET(request)

    const cookie = response.cookies.get(GIGS_VIEW_COOKIE)
    expect(cookie?.value).toBe('month')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('lax')
    expect(cookie?.path).toBe('/')
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 365)
  })

  it('falls back to the cookie config default for an invalid value', async () => {
    const request = makeRequest(
      'http://localhost:3000/api/preferences?cookie=gigs-view&value=nonsense&redirect=%2Fgigs'
    )

    const response = await GET(request)

    expect(response.cookies.get(GIGS_VIEW_COOKIE)?.value).toBe('compact')
  })

  it('falls back to the cookie config default when the value param is missing', async () => {
    // Regression: a naive `rawValue ?? ''` check would let this through if an
    // allowlist ever included '' as a valid value, setting the cookie to the
    // literal string "null" instead of the intended default.
    const request = makeRequest('http://localhost:3000/api/preferences?cookie=gigs-view&redirect=%2Fgigs')

    const response = await GET(request)

    expect(response.cookies.get(GIGS_VIEW_COOKIE)?.value).toBe('compact')
  })

  it('rejects an unknown cookie name with 400 and sets no cookie', async () => {
    const request = makeRequest(
      'http://localhost:3000/api/preferences?cookie=not-a-real-cookie&value=whatever&redirect=%2Fgigs'
    )

    const response = await GET(request)

    expect(response.status).toBe(400)
    expect(response.cookies.get('not-a-real-cookie')).toBeUndefined()
  })

  it('rejects a missing cookie name with 400', async () => {
    const request = makeRequest('http://localhost:3000/api/preferences?value=month&redirect=%2Fgigs')

    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('falls back to "/" for a protocol-relative redirect target', async () => {
    const request = makeRequest(
      'http://localhost:3000/api/preferences?cookie=gigs-view&value=month&redirect=%2F%2Fevil.example.com'
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('falls back to "/" for a backslash redirect target', async () => {
    const request = makeRequest(
      'http://localhost:3000/api/preferences?cookie=gigs-view&value=month&redirect=%2F%5Cevil.example.com'
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('falls back to "/" for an absolute-URL redirect target', async () => {
    const request = makeRequest(
      'http://localhost:3000/api/preferences?cookie=gigs-view&value=month&redirect=https%3A%2F%2Fevil.example.com'
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('falls back to "/" when the redirect param is missing', async () => {
    const request = makeRequest('http://localhost:3000/api/preferences?cookie=gigs-view&value=month')

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('uses only the first host when x-forwarded-host is a comma-separated list', async () => {
    // A multi-hop proxy chain can append rather than replace this header —
    // the first entry is the one the original client actually requested.
    const request = makeRequest(
      'http://internal-container:8080/api/preferences?cookie=gigs-view&value=month&redirect=%2Fgigs',
      {
        'x-forwarded-host': 'proud-ocean-04af2510f.7.azurestaticapps.net, internal-proxy:9090',
        'x-forwarded-proto': 'https',
      }
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe(
      'https://proud-ocean-04af2510f.7.azurestaticapps.net/gigs'
    )
  })

  it('defaults to https for an unrecognized x-forwarded-proto value', async () => {
    const request = makeRequest(
      'http://internal-container:8080/api/preferences?cookie=gigs-view&value=month&redirect=%2Fgigs',
      {
        'x-forwarded-host': 'proud-ocean-04af2510f.7.azurestaticapps.net',
        'x-forwarded-proto': 'javascript',
      }
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe(
      'https://proud-ocean-04af2510f.7.azurestaticapps.net/gigs'
    )
  })

  it('falls back to the request URL origin when x-forwarded-host is not a valid host', async () => {
    const request = makeRequest(
      'http://localhost:3000/api/preferences?cookie=gigs-view&value=month&redirect=%2Fgigs',
      { 'x-forwarded-host': 'not a valid host/with spaces' }
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/gigs')
  })
})
