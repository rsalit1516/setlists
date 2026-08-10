import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { isSafeRedirectPath, resolveOrigin } from './http-redirect'

function makeRequest(url: string, headers?: Record<string, string>) {
  return new NextRequest(url, headers ? { headers } : undefined)
}

describe('isSafeRedirectPath', () => {
  it('accepts a same-origin relative path', () => {
    expect(isSafeRedirectPath('/songs')).toBe(true)
  })

  it('rejects null', () => {
    expect(isSafeRedirectPath(null)).toBe(false)
  })

  it('rejects a path that does not start with /', () => {
    expect(isSafeRedirectPath('songs')).toBe(false)
  })

  it('rejects a protocol-relative path', () => {
    expect(isSafeRedirectPath('//evil.example.com')).toBe(false)
  })

  it('rejects a backslash path some browsers treat as protocol-relative', () => {
    expect(isSafeRedirectPath('/\\evil.example.com')).toBe(false)
  })

  it('rejects an absolute URL', () => {
    expect(isSafeRedirectPath('https://evil.example.com')).toBe(false)
  })
})

describe('resolveOrigin', () => {
  it('prefers the forwarded host/proto over the request URL host', () => {
    const request = makeRequest('http://internal-container:8080/api/preferences', {
      'x-forwarded-host': 'proud-ocean-04af2510f.7.azurestaticapps.net',
      'x-forwarded-proto': 'https',
    })

    expect(resolveOrigin(request)).toBe('https://proud-ocean-04af2510f.7.azurestaticapps.net')
  })

  it('falls back to the request URL origin when there is no forwarded host', () => {
    const request = makeRequest('http://localhost:3000/api/preferences')

    expect(resolveOrigin(request)).toBe('http://localhost:3000')
  })

  it('uses only the first host when x-forwarded-host is a comma-separated list', () => {
    const request = makeRequest('http://internal-container:8080/api/preferences', {
      'x-forwarded-host': 'proud-ocean-04af2510f.7.azurestaticapps.net, internal-proxy:9090',
      'x-forwarded-proto': 'https',
    })

    expect(resolveOrigin(request)).toBe('https://proud-ocean-04af2510f.7.azurestaticapps.net')
  })

  it('defaults to https for an unrecognized x-forwarded-proto value', () => {
    const request = makeRequest('http://internal-container:8080/api/preferences', {
      'x-forwarded-host': 'proud-ocean-04af2510f.7.azurestaticapps.net',
      'x-forwarded-proto': 'javascript',
    })

    expect(resolveOrigin(request)).toBe('https://proud-ocean-04af2510f.7.azurestaticapps.net')
  })

  it('falls back to the request URL origin when x-forwarded-host is not a valid host', () => {
    const request = makeRequest('http://localhost:3000/api/preferences', {
      'x-forwarded-host': 'not a valid host/with spaces',
    })

    expect(resolveOrigin(request)).toBe('http://localhost:3000')
  })
})
