import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    song: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'
import { fetchLyrics, importLyricsForSong, importMissingLyrics, pickBestMatch } from './lyrics-import'

beforeEach(() => vi.clearAllMocks())

function track(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    trackName: 'Cheap Sunglasses',
    artistName: 'ZZ Top',
    duration: 325,
    instrumental: false,
    plainLyrics: 'Line one\nLine two',
    ...overrides,
  } as never
}

function fetchReturning(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body }) as unknown as typeof fetch
}

describe('pickBestMatch', () => {
  const lookup = { title: 'Cheap Sunglasses', artist: 'ZZ Top', durationSeconds: 325 }

  it('matches title case- and punctuation-insensitively', () => {
    const result = pickBestMatch({ ...lookup, title: 'cheap sunglasses!' }, [track()])
    expect(result).not.toBeNull()
  })

  it('ignores a leading "The" and accepts any artist in a slash-separated list', () => {
    const result = pickBestMatch(
      { title: 'The Weight', artist: 'Other / The Band', durationSeconds: null },
      [track({ trackName: 'The Weight', artistName: 'Band' })]
    )
    expect(result).not.toBeNull()
  })

  it('rejects a different artist', () => {
    expect(pickBestMatch(lookup, [track({ artistName: 'Someone Else' })])).toBeNull()
  })

  it('rejects a different title, instrumentals and entries without lyrics', () => {
    expect(pickBestMatch(lookup, [track({ trackName: 'Sharp Dressed Man' })])).toBeNull()
    expect(pickBestMatch(lookup, [track({ instrumental: true })])).toBeNull()
    expect(pickBestMatch(lookup, [track({ plainLyrics: '  ' })])).toBeNull()
  })

  it('rejects a version whose duration is far from the known duration', () => {
    expect(pickBestMatch(lookup, [track({ duration: 600 })])).toBeNull()
  })

  it('prefers the candidate closest in duration', () => {
    const result = pickBestMatch(lookup, [track({ id: 1, duration: 330 }), track({ id: 2, duration: 326 })])
    expect(result).toMatchObject({ id: 2 })
  })

  it('takes the first match when the duration is unknown', () => {
    const result = pickBestMatch({ ...lookup, durationSeconds: null }, [track({ id: 1 }), track({ id: 2 })])
    expect(result).toMatchObject({ id: 1 })
  })

  it('never guesses for medley titles', () => {
    expect(pickBestMatch({ title: 'Brick > Shakedown', artist: null, durationSeconds: null }, [
      track({ trackName: 'Brick > Shakedown' }),
    ])).toBeNull()
  })
})

describe('fetchLyrics', () => {
  it('returns sanitized HTML and a source URL for a confident match', async () => {
    const fetchImpl = fetchReturning([track({ id: 42 })])

    const result = await fetchLyrics({ title: 'Cheap Sunglasses', artist: 'ZZ Top', durationSeconds: 325 }, fetchImpl)

    expect(result).toEqual({ html: '<p>Line one</p><p>Line two</p>', sourceUrl: 'https://lrclib.net/api/get/42' })
  })

  it('strips markup that a provider might return', async () => {
    const fetchImpl = fetchReturning([track({ plainLyrics: '<script>alert(1)</script>Safe' })])

    const result = await fetchLyrics({ title: 'Cheap Sunglasses', artist: 'ZZ Top', durationSeconds: null }, fetchImpl)

    expect(result?.html).not.toContain('<script>')
  })

  it('searches only the first artist of a slash-separated list', async () => {
    const fetchImpl = fetchReturning([])

    await fetchLyrics({ title: 'Brick', artist: 'Pink Floyd / Grateful Dead', durationSeconds: null }, fetchImpl)

    expect(vi.mocked(fetchImpl).mock.calls[0][0]).toContain('artist_name=Pink+Floyd')
  })

  it('returns null without calling the network for a medley', async () => {
    const fetchImpl = fetchReturning([])

    expect(await fetchLyrics({ title: 'A > B', artist: null, durationSeconds: null }, fetchImpl)).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('throws when the provider responds with an error status', async () => {
    await expect(
      fetchLyrics({ title: 'Cheap Sunglasses', artist: null, durationSeconds: null }, fetchReturning(null, false), 0)
    ).rejects.toThrow('LRCLIB search failed: 500')
  })

  it('retries once after a 429 and succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => null })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [track()] }) as unknown as typeof fetch

    const result = await fetchLyrics({ title: 'Cheap Sunglasses', artist: 'ZZ Top', durationSeconds: 325 }, fetchImpl, 0)

    expect(result).not.toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('retries once after a network failure, then surfaces the original message', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('fetch failed')) as unknown as typeof fetch

    await expect(
      fetchLyrics({ title: 'Cheap Sunglasses', artist: null, durationSeconds: null }, fetchImpl, 0)
    ).rejects.toThrow('fetch failed')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 4xx other than 429', async () => {
    const fetchImpl = fetchReturning(null, false)
    vi.mocked(fetchImpl).mockResolvedValue({ ok: false, status: 404, json: async () => null } as never)

    await expect(
      fetchLyrics({ title: 'Cheap Sunglasses', artist: null, durationSeconds: null }, fetchImpl, 0)
    ).rejects.toThrow('LRCLIB search failed: 404')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('importMissingLyrics', () => {
  const songs = [
    { id: 'a', title: 'Cheap Sunglasses', artist: 'ZZ Top', durationSeconds: 325 },
    { id: 'b', title: 'Unknown Tune', artist: null, durationSeconds: null },
  ]

  beforeEach(() => {
    vi.mocked(prisma.song.findMany).mockResolvedValue(songs as never)
    vi.mocked(prisma.song.updateMany).mockResolvedValue({ count: 1 } as never)
  })

  function fetchByTitle() {
    return vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => (url.includes('Cheap') ? [track()] : []),
    })) as unknown as typeof fetch
  }

  it('only queries active songs that have no lyrics', async () => {
    await importMissingLyrics({ fetchImpl: fetchByTitle(), delayMs: 0 })

    expect(prisma.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true, lyrics: null } })
    )
  })

  it('writes imported lyrics with provenance, guarded so existing lyrics are never overwritten', async () => {
    const summary = await importMissingLyrics({ fetchImpl: fetchByTitle(), delayMs: 0 })

    expect(prisma.song.updateMany).toHaveBeenCalledTimes(1)
    expect(prisma.song.updateMany).toHaveBeenCalledWith({
      where: { id: 'a', lyrics: null },
      data: {
        lyrics: '<p>Line one</p><p>Line two</p>',
        lyricsSource: 'IMPORTED',
        lyricsSourceUrl: 'https://lrclib.net/api/get/1',
        lyricsImportedAt: expect.any(Date),
      },
    })
    expect(summary).toMatchObject({ imported: 1, noMatch: 1, errors: 0 })
  })

  it('writes nothing in dry-run mode but still reports what would be imported', async () => {
    const summary = await importMissingLyrics({ dryRun: true, fetchImpl: fetchByTitle(), delayMs: 0 })

    expect(prisma.song.updateMany).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ dryRun: true, imported: 1, noMatch: 1 })
  })

  it('counts a failing lookup as an error and keeps going', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] }) as unknown as typeof fetch

    const summary = await importMissingLyrics({ fetchImpl, delayMs: 0, retryDelayMs: 0 })

    expect(summary).toMatchObject({ imported: 0, noMatch: 1, errors: 1 })
    expect(summary.results[0]).toMatchObject({ outcome: 'error', error: 'network' })
  })

  it('passes the limit through to the query', async () => {
    await importMissingLyrics({ limit: 5, fetchImpl: fetchByTitle(), delayMs: 0 })

    expect(prisma.song.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }))
  })
})

describe('importLyricsForSong', () => {
  const song = { id: 'a', title: 'Cheap Sunglasses', artist: 'ZZ Top', durationSeconds: 325, lyrics: null }

  it('does nothing for a song that already has lyrics', async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue({ ...song, lyrics: '<p>Mine</p>' } as never)
    const fetchImpl = fetchReturning([track()])

    expect(await importLyricsForSong('a', fetchImpl)).toBe('no-match')
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(prisma.song.updateMany).not.toHaveBeenCalled()
  })

  it('imports and reports success', async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue(song as never)
    vi.mocked(prisma.song.updateMany).mockResolvedValue({ count: 1 } as never)

    expect(await importLyricsForSong('a', fetchReturning([track()]))).toBe('imported')
  })

  it('reports no-match when the guarded write finds the song already filled in', async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue(song as never)
    vi.mocked(prisma.song.updateMany).mockResolvedValue({ count: 0 } as never)

    expect(await importLyricsForSong('a', fetchReturning([track()]))).toBe('no-match')
  })
})
