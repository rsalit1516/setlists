import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  default: {
    genre: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'
import { GET } from './route'
import { SONGS_GENRES_COOKIE } from '@/lib/songs-genre-filter'

function makeRequest(url: string) {
  return new NextRequest(url)
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/genre-filter', () => {
  it('sets the cookie to only the ids that are real, active genres', async () => {
    vi.mocked(prisma.genre.findMany).mockResolvedValue([{ id: 'g-1' }, { id: 'g-2' }] as never)
    const request = makeRequest(
      'http://localhost:3000/api/genre-filter?genres=g-1,g-2,bogus&redirect=%2Fsongs'
    )

    const response = await GET(request)

    expect(prisma.genre.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['g-1', 'g-2', 'bogus'] }, isActive: true },
      select: { id: true },
    })
    expect(response.cookies.get(SONGS_GENRES_COOKIE)?.value).toBe('g-1,g-2')
  })

  it('sets an empty cookie value when no genres are requested', async () => {
    const request = makeRequest('http://localhost:3000/api/genre-filter?redirect=%2Fsongs')

    const response = await GET(request)

    expect(prisma.genre.findMany).not.toHaveBeenCalled()
    expect(response.cookies.get(SONGS_GENRES_COOKIE)?.value).toBe('')
  })

  it('sets an empty cookie value when every requested id is invalid or inactive', async () => {
    vi.mocked(prisma.genre.findMany).mockResolvedValue([] as never)
    const request = makeRequest('http://localhost:3000/api/genre-filter?genres=bogus&redirect=%2Fsongs')

    const response = await GET(request)

    expect(response.cookies.get(SONGS_GENRES_COOKIE)?.value).toBe('')
  })

  it('redirects to the given path', async () => {
    vi.mocked(prisma.genre.findMany).mockResolvedValue([{ id: 'g-1' }] as never)
    const request = makeRequest('http://localhost:3000/api/genre-filter?genres=g-1&redirect=%2Fsongs%3Fstatus%3DREADY')

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/songs?status=READY')
  })

  it('falls back to "/" for an unsafe redirect target', async () => {
    const request = makeRequest(
      'http://localhost:3000/api/genre-filter?genres=g-1&redirect=%2F%2Fevil.example.com'
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('sets standard persistence-cookie attributes', async () => {
    vi.mocked(prisma.genre.findMany).mockResolvedValue([{ id: 'g-1' }] as never)
    const request = makeRequest('http://localhost:3000/api/genre-filter?genres=g-1&redirect=%2Fsongs')

    const response = await GET(request)

    const cookie = response.cookies.get(SONGS_GENRES_COOKIE)
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('lax')
    expect(cookie?.path).toBe('/')
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 365)
  })
})
