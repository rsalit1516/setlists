import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    song: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    bandSong: {
      findFirst: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    genre: {
      findMany: vi.fn(),
    },
    // Array form only: resolves the already-built operations.
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}))

vi.mock('@/lib/band', async () => ({
  ...(await vi.importActual<typeof import('@/lib/band')>('@/lib/band')),
  getBandContext: vi.fn(),
}))

vi.mock('@/lib/ownership', async () => ({
  ...(await vi.importActual<typeof import('@/lib/ownership')>('@/lib/ownership')),
  assertOwned: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Mirrors Next.js's real redirect(): it throws to unwind the action, so
// "nothing runs after redirect" (per CLAUDE.md) is true in tests too — the
// throw also proves the prisma write above it already happened.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('@/lib/services/azure-blob', () => ({
  uploadChartFile: vi.fn(),
  deleteChartFile: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: vi.fn() }))

vi.mock('@/lib/services/lyrics-import', () => ({ importLyricsForSong: vi.fn() }))

import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { importLyricsForSong } from '@/lib/services/lyrics-import'
import { getBandContext } from '@/lib/band'
import { assertOwned, NotFoundError } from '@/lib/ownership'
import { createSong, updateSong, findLyrics, deleteSong, addSongToCatalog, toggleSongsGenreFilter } from './actions'
import { SONGS_GENRES_COOKIE } from '@/lib/songs-genre-filter'

function mockBand(overrides: { bandId?: string; isPlatformAdmin?: boolean } = {}) {
  vi.mocked(getBandContext).mockResolvedValue({
    userId: null,
    bandId: 'band-1',
    role: 'ADMIN',
    isPlatformAdmin: true,
    ...overrides,
  })
}

// What the actions read to find a song's shared row from a BandSong id.
function mockBandSong(song: { ownerBandId?: string | null; chartFileUrl?: string | null; lyrics?: string | null } = {}) {
  vi.mocked(prisma.bandSong.findFirst).mockResolvedValue({
    songId: 'song-1',
    song: { ownerBandId: 'band-1', chartFileUrl: null, lyrics: null, ...song },
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockBand()
  vi.mocked(assertOwned).mockResolvedValue(undefined)
  vi.mocked(prisma.song.findMany).mockResolvedValue([])
})

function mockCookieStore(currentValue?: string) {
  const store = {
    get: vi.fn(() => (currentValue === undefined ? undefined : { value: currentValue })),
    set: vi.fn(),
  }
  vi.mocked(cookies).mockResolvedValue(store as never)
  return store
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const fields: Record<string, string> = {
    title: 'Test Song',
    artist: '',
    key: '',
    singer: '',
    status: 'WISH',
    keyboardRequired: 'false',
    duration: '',
    bpm: '',
    lyrics: '',
    ...overrides,
  }
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

function buildFormDataWithGenres(genreIds: string[], overrides: Record<string, string> = {}): FormData {
  const fd = buildFormData(overrides)
  for (const genreId of genreIds) fd.append('genreIds', genreId)
  return fd
}

describe('createSong', () => {
  it('sanitizes rich-text lyrics before persisting, stripping scripts and event handlers', async () => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
    const fd = buildFormData({ lyrics: '<p onclick="alert(1)">Hi <script>alert(1)</script></p>' })

    await expect(createSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ lyrics: '<p>Hi </p>' }),
    })
  })

  it('preserves allowed rich-text formatting (bold, lists) from the editor', async () => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
    const html = '<p><strong>Chorus</strong></p><ul><li><p>cue</p></li></ul>'
    const fd = buildFormData({ lyrics: html })

    await expect(createSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ lyrics: html }),
    })
  })

  it('converts legacy plain-text lyrics into paragraph HTML instead of losing line breaks', async () => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
    const fd = buildFormData({ lyrics: 'Verse 1\nChorus' })

    await expect(createSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ lyrics: '<p>Verse 1</p><p>Chorus</p>' }),
    })
  })

  it('stores null when lyrics is empty rather than an empty string', async () => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
    const fd = buildFormData({ lyrics: '' })

    await expect(createSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ lyrics: null }),
    })
  })

  it('returns a validation error and never touches the database when title is blank', async () => {
    const fd = buildFormData({ title: '  ', lyrics: '<p>Some lyrics</p>' })

    const result = await createSong(null, fd)

    expect(result).toEqual({ error: 'Title is required.' })
    expect(prisma.song.create).not.toHaveBeenCalled()
  })

  it('stores a valid BPM as a number', async () => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
    await expect(createSong(null, buildFormData({ bpm: '108' }))).rejects.toThrow('REDIRECT:/songs')
    expect(prisma.song.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bpm: 108 }) })
    )
  })

  it('stores null when BPM is 0, so a wrong value can be cleared', async () => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
    await expect(createSong(null, buildFormData({ bpm: '0' }))).rejects.toThrow('REDIRECT:/songs')
    expect(prisma.song.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bpm: null }) })
    )
  })

  it('returns a validation error and never touches the database when BPM is out of range', async () => {
    const result = await createSong(null, buildFormData({ bpm: '12' }))

    expect(result).toEqual({ error: expect.stringContaining('BPM must be between 30 and 300') })
    expect(prisma.song.create).not.toHaveBeenCalled()
  })

  it('connects the selected genres', async () => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
    const fd = buildFormDataWithGenres(['genre-1', 'genre-2'])

    await expect(createSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        genres: { connect: [{ id: 'genre-1' }, { id: 'genre-2' }] },
      }),
    })
  })

  it('dedupes repeated genre ids from the checkbox list', async () => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
    const fd = buildFormDataWithGenres(['genre-1', 'genre-1'])

    await expect(createSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ genres: { connect: [{ id: 'genre-1' }] } }),
    })
  })

  it('connects no genres when none are checked', async () => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
    const fd = buildFormData()

    await expect(createSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ genres: { connect: [] } }),
    })
  })

  it("accepts SHELVED as a valid status, stored on the band's own entry", async () => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
    const fd = buildFormData({ status: 'SHELVED' })

    await expect(createSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bandSongs: { create: expect.objectContaining({ status: 'SHELVED' }) },
      }),
    })
  })

  it('creates the song private to the band, with the band-owned fields on its BandSong', async () => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
    const fd = buildFormData({ singer: ' Dana ', status: 'READY', keyboardRequired: 'true', key: 'G' })

    await expect(createSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    const { data } = vi.mocked(prisma.song.create).mock.calls[0][0] as { data: Record<string, unknown> }
    expect(data).toMatchObject({
      ownerBandId: 'band-1',
      key: 'G',
      bandSongs: { create: { bandId: 'band-1', singer: 'Dana', status: 'READY', keyboardRequired: true } },
    })
    expect(data).not.toHaveProperty('singer')
    expect(data).not.toHaveProperty('status')
    expect(data).not.toHaveProperty('keyboardRequired')
  })
})

describe('createSong duplicate check', () => {
  const existing = (overrides: Record<string, unknown> = {}) => ({
    id: 'song-9',
    title: "Don't Stop Believin'",
    artist: 'Journey',
    ownerBandId: null,
    bandSongs: [],
    ...overrides,
  })

  beforeEach(() => {
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'song-1' } as never)
  })

  it('refuses a song that is already in the shared catalog and points to Add Song', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([existing()] as never)

    const result = await createSong(null, buildFormData({ title: 'dont stop believin', artist: 'journey' }))

    expect(result).toEqual({ error: expect.stringContaining('is already in the catalog') })
    expect(prisma.song.create).not.toHaveBeenCalled()
  })

  it('says so when the band already has the song', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      existing({ bandSongs: [{ id: 'bs-1', isActive: true }] }),
    ] as never)

    const result = await createSong(null, buildFormData({ title: "Don't Stop Believin'", artist: 'Journey' }))

    expect(result).toEqual({ error: expect.stringContaining('is already in your songs') })
  })

  it('searches only within the acting band', async () => {
    await expect(createSong(null, buildFormData({ title: 'Wonderwall' }))).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: [{ ownerBandId: null }, { ownerBandId: 'band-1' }] }),
      })
    )
  })

  it('lets a cover by a different artist through', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      existing({ title: 'Hurt', artist: 'Nine Inch Nails' }),
    ] as never)

    await expect(createSong(null, buildFormData({ title: 'Hurt', artist: 'Johnny Cash' }))).rejects.toThrow(
      'REDIRECT:/songs'
    )
    expect(prisma.song.create).toHaveBeenCalledTimes(1)
  })

  it('skips the check when Add Song has already shown the user the matches', async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([existing()] as never)

    await expect(
      createSong(null, buildFormData({ title: "Don't Stop Believin'", artist: 'Journey', allowDuplicate: 'true' }))
    ).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.findMany).not.toHaveBeenCalled()
    expect(prisma.song.create).toHaveBeenCalledTimes(1)
  })
})

describe('addSongToCatalog', () => {
  it("gives the band its own entry for a song it is allowed to add, then opens it for editing", async () => {
    vi.mocked(prisma.bandSong.upsert).mockResolvedValue({ id: 'bs-9' } as never)

    await expect(addSongToCatalog('song-9')).rejects.toThrow('REDIRECT:/songs/bs-9/edit')

    expect(assertOwned).toHaveBeenCalledWith('song', 'band-1', 'song-9')
    expect(prisma.bandSong.upsert).toHaveBeenCalledWith({
      where: { bandId_songId: { bandId: 'band-1', songId: 'song-9' } },
      update: { isActive: true },
      create: { bandId: 'band-1', songId: 'song-9' },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/songs')
  })

  it('brings a previously removed entry back without touching its status or singer', async () => {
    vi.mocked(prisma.bandSong.upsert).mockResolvedValue({ id: 'bs-9' } as never)

    await expect(addSongToCatalog('song-9')).rejects.toThrow('REDIRECT')

    const { update } = vi.mocked(prisma.bandSong.upsert).mock.calls[0][0]
    expect(update).toEqual({ isActive: true })
  })

  it("refuses another band's private song, or a retired one, without writing", async () => {
    vi.mocked(assertOwned).mockRejectedValue(new NotFoundError('song'))

    await expect(addSongToCatalog('someone-elses-song')).rejects.toBeInstanceOf(NotFoundError)

    expect(prisma.bandSong.upsert).not.toHaveBeenCalled()
  })
})

describe('updateSong', () => {
  beforeEach(() => {
    mockBandSong()
    vi.mocked(prisma.song.update).mockResolvedValue({} as never)
    vi.mocked(prisma.bandSong.update).mockResolvedValue({} as never)
  })

  it('re-sanitizes lyrics on edit, stripping scripts injected since the row was created', async () => {
    const fd = buildFormData({ id: 'bs-1', lyrics: '<p>Safe</p><script>alert(1)</script>' })

    await expect(updateSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: 'song-1' },
      data: expect.objectContaining({ lyrics: '<p>Safe</p>' }),
    })
  })

  it('does not discard existing formatted lyrics when unrelated fields are edited', async () => {
    const html = '<p><em>Bridge</em></p><p><mark>hold here</mark></p>'
    const fd = buildFormData({ id: 'bs-1', title: 'Renamed', lyrics: html })

    await expect(updateSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: 'song-1' },
      data: expect.objectContaining({ title: 'Renamed', lyrics: html }),
    })
  })

  it('returns a validation error and never touches the database when title is blank', async () => {
    const fd = buildFormData({ id: 'bs-1', title: '  ' })

    const result = await updateSong(null, fd)

    expect(result).toEqual({ error: 'Title is required.' })
    expect(prisma.song.update).not.toHaveBeenCalled()
  })

  it('replaces the full genre selection, including clearing it when nothing is checked', async () => {
    const fd = buildFormData({ id: 'bs-1' })

    await expect(updateSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: 'song-1' },
      data: expect.objectContaining({ genres: { set: [] } }),
    })
  })

  it('sets the genre relation to exactly the checked ids', async () => {
    const fd = buildFormDataWithGenres(['genre-2'], { id: 'bs-1' })

    await expect(updateSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: 'song-1' },
      data: expect.objectContaining({ genres: { set: [{ id: 'genre-2' }] } }),
    })
  })

  it('rejects an out-of-range BPM on edit without writing', async () => {
    const result = await updateSong(null, buildFormData({ id: 'bs-1', bpm: '301' }))

    expect(result).toEqual({ error: expect.stringContaining('BPM must be between 30 and 300') })
    expect(prisma.song.update).not.toHaveBeenCalled()
  })

  it("moves a song to SHELVED on the band's own entry only", async () => {
    const fd = buildFormData({ id: 'bs-1', status: 'SHELVED' })

    await expect(updateSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.bandSong.update).toHaveBeenCalledWith({
      where: { id: 'bs-1' },
      data: { singer: null, status: 'SHELVED', keyboardRequired: false },
    })
    const { data } = vi.mocked(prisma.song.update).mock.calls[0][0] as { data: Record<string, unknown> }
    expect(data).not.toHaveProperty('status')
  })

  it("looks the BandSong up within the band and says 'not found' for another band's id", async () => {
    vi.mocked(prisma.bandSong.findFirst).mockResolvedValue(null)

    const result = await updateSong(null, buildFormData({ id: 'foreign-bs' }))

    expect(result).toEqual({ error: 'Song not found.' })
    expect(prisma.bandSong.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'foreign-bs', bandId: 'band-1' } })
    )
    expect(prisma.bandSong.update).not.toHaveBeenCalled()
    expect(prisma.song.update).not.toHaveBeenCalled()
  })

  it('updates the shared fields and the band fields in one transaction', async () => {
    const fd = buildFormData({ id: 'bs-1', title: 'Renamed', singer: 'Dana' })

    await expect(updateSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(vi.mocked(prisma.$transaction).mock.calls[0][0]).toHaveLength(2)
    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: 'song-1' },
      data: expect.objectContaining({ title: 'Renamed' }),
    })
    expect(prisma.bandSong.update).toHaveBeenCalledWith({
      where: { id: 'bs-1' },
      data: expect.objectContaining({ singer: 'Dana' }),
    })
  })

  it('lets a platform admin edit a master song', async () => {
    mockBandSong({ ownerBandId: null })
    mockBand({ isPlatformAdmin: true })

    await expect(updateSong(null, buildFormData({ id: 'bs-1', title: 'Fixed typo' }))).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.update).toHaveBeenCalledTimes(1)
  })

  it("leaves a master song's shared fields alone when the band is not a platform admin, but still saves its own status", async () => {
    mockBandSong({ ownerBandId: null })
    mockBand({ isPlatformAdmin: false })

    await expect(
      updateSong(null, buildFormData({ id: 'bs-1', title: 'Hijacked title', status: 'READY' }))
    ).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.update).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.$transaction).mock.calls[0][0]).toHaveLength(1)
    expect(prisma.bandSong.update).toHaveBeenCalledWith({
      where: { id: 'bs-1' },
      data: expect.objectContaining({ status: 'READY' }),
    })
  })

  it("never edits another band's private song, even from a platform admin context", async () => {
    mockBandSong({ ownerBandId: 'band-2' })
    mockBand({ isPlatformAdmin: true })

    await expect(updateSong(null, buildFormData({ id: 'bs-1', title: 'Hijacked title' }))).rejects.toThrow(
      'REDIRECT:/songs'
    )

    expect(prisma.song.update).not.toHaveBeenCalled()
  })
})

describe('deleteSong', () => {
  it("removes the song from the band's catalog only, leaving the shared song alone", async () => {
    vi.mocked(prisma.bandSong.update).mockResolvedValue({} as never)

    await deleteSong('bs-1')

    expect(assertOwned).toHaveBeenCalledWith('bandSong', 'band-1', 'bs-1')
    expect(prisma.bandSong.update).toHaveBeenCalledWith({ where: { id: 'bs-1' }, data: { isActive: false } })
    expect(prisma.song.update).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/songs')
  })

  it("rejects another band's entry without writing", async () => {
    vi.mocked(assertOwned).mockRejectedValue(new NotFoundError('bandSong'))

    await expect(deleteSong('foreign-bs')).rejects.toBeInstanceOf(NotFoundError)

    expect(prisma.bandSong.update).not.toHaveBeenCalled()
  })
})

describe('toggleSongsGenreFilter', () => {
  it('adds a genre id not currently in the cookie', async () => {
    const store = mockCookieStore(undefined)
    vi.mocked(prisma.genre.findMany).mockResolvedValue([{ id: 'g-1' }] as never)

    await toggleSongsGenreFilter('g-1')

    expect(prisma.genre.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['g-1'] }, isActive: true },
      select: { id: true },
    })
    expect(store.set).toHaveBeenCalledWith(SONGS_GENRES_COOKIE, 'g-1', expect.any(Object))
  })

  it('removes a genre id already in the cookie — the toggle-off case', async () => {
    const store = mockCookieStore('g-1,g-2')
    vi.mocked(prisma.genre.findMany).mockResolvedValue([{ id: 'g-2' }] as never)

    await toggleSongsGenreFilter('g-1')

    expect(prisma.genre.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['g-2'] }, isActive: true },
      select: { id: true },
    })
    expect(store.set).toHaveBeenCalledWith(SONGS_GENRES_COOKIE, 'g-2', expect.any(Object))
  })

  it('deselecting the only selected genre clears the cookie and skips the db lookup — back to "All"', async () => {
    const store = mockCookieStore('g-1')

    await toggleSongsGenreFilter('g-1')

    expect(prisma.genre.findMany).not.toHaveBeenCalled()
    expect(store.set).toHaveBeenCalledWith(SONGS_GENRES_COOKIE, '', expect.any(Object))
  })

  it('drops ids that are no longer real, active genres', async () => {
    const store = mockCookieStore('g-1')
    vi.mocked(prisma.genre.findMany).mockResolvedValue([] as never)

    await toggleSongsGenreFilter('g-2')

    expect(store.set).toHaveBeenCalledWith(SONGS_GENRES_COOKIE, '', expect.any(Object))
  })

  it('sets standard persistence-cookie attributes', async () => {
    const store = mockCookieStore(undefined)
    vi.mocked(prisma.genre.findMany).mockResolvedValue([{ id: 'g-1' }] as never)

    await toggleSongsGenreFilter('g-1')

    expect(store.set).toHaveBeenCalledWith(SONGS_GENRES_COOKIE, 'g-1', {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: false,
    })
  })

  it('revalidates the songs page so the pills reflect the new selection', async () => {
    mockCookieStore(undefined)
    vi.mocked(prisma.genre.findMany).mockResolvedValue([{ id: 'g-1' }] as never)

    await toggleSongsGenreFilter('g-1')

    expect(revalidatePath).toHaveBeenCalledWith('/songs')
  })
})

describe('lyrics provenance', () => {
  beforeEach(() => {
    mockBandSong()
    vi.mocked(prisma.bandSong.update).mockResolvedValue({} as never)
    vi.mocked(prisma.song.update).mockResolvedValue({} as never)
    vi.mocked(prisma.song.create).mockResolvedValue({ id: 'bs-1' } as never)
  })

  it('marks lyrics typed into a new song as MANUAL', async () => {
    await expect(createSong(null, buildFormData({ lyrics: '<p>Hello</p>' }))).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ lyricsSource: 'MANUAL', lyricsSourceUrl: null, lyricsImportedAt: null, lyricsUpdatedAt: expect.any(Date) }),
    })
  })

  it('flips imported lyrics to MANUAL when a band member edits them', async () => {
    mockBandSong({ lyrics: '<p>Old</p>' })

    await expect(updateSong(null, buildFormData({ id: 'bs-1', lyrics: '<p>Corrected</p>' }))).rejects.toThrow(
      'REDIRECT:/songs'
    )

    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: 'song-1' },
      data: expect.objectContaining({ lyricsSource: 'MANUAL', lyricsSourceUrl: null, lyricsImportedAt: null, lyricsUpdatedAt: expect.any(Date) }),
    })
  })

  it('leaves the provenance fields alone when lyrics are unchanged', async () => {
    mockBandSong({ lyrics: '<p>Same</p>' })

    await expect(updateSong(null, buildFormData({ id: 'bs-1', title: 'Renamed', lyrics: '<p>Same</p>' }))).rejects.toThrow(
      'REDIRECT:/songs'
    )

    const { data } = vi.mocked(prisma.song.update).mock.calls[0][0] as { data: Record<string, unknown> }
    expect(data).not.toHaveProperty('lyricsSource')
    expect(data).not.toHaveProperty('lyricsUpdatedAt')
  })

  it('does not treat the editor re-serializing blank lines as an edit', async () => {
    mockBandSong({ lyrics: '<p>A</p><p><br></p><p>B</p>' })

    await expect(
      updateSong(null, buildFormData({ id: 'bs-1', lyrics: '<p>A</p><p></p><p>B</p>' }))
    ).rejects.toThrow('REDIRECT:/songs')

    const { data } = vi.mocked(prisma.song.update).mock.calls[0][0] as { data: Record<string, unknown> }
    expect(data).not.toHaveProperty('lyricsSource')
    expect(data).not.toHaveProperty('lyricsUpdatedAt')
  })

  it('clears the source when lyrics are emptied', async () => {
    mockBandSong({ lyrics: '<p>Old</p>' })

    await expect(updateSong(null, buildFormData({ id: 'bs-1', lyrics: '' }))).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: 'song-1' },
      data: expect.objectContaining({ lyricsSource: null }),
    })
  })
})

describe('findLyrics', () => {
  beforeEach(() => mockBandSong())

  it("imports into the shared Song behind the band's entry, and revalidates the page after success", async () => {
    vi.mocked(importLyricsForSong).mockResolvedValue('imported')

    expect(await findLyrics('bs-1')).toEqual({ outcome: 'imported' })
    expect(importLyricsForSong).toHaveBeenCalledWith('song-1')
    expect(revalidatePath).toHaveBeenCalledWith('/songs/bs-1')
  })

  it('reports no-match without revalidating', async () => {
    vi.mocked(importLyricsForSong).mockResolvedValue('no-match')

    expect(await findLyrics('bs-1')).toEqual({ outcome: 'no-match' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('turns a provider failure into an error outcome instead of throwing', async () => {
    vi.mocked(importLyricsForSong).mockRejectedValue(new Error('boom'))

    expect(await findLyrics('bs-1')).toEqual({ outcome: 'error' })
  })

  it("throws NotFoundError for another band's entry and never calls the provider", async () => {
    vi.mocked(prisma.bandSong.findFirst).mockResolvedValue(null)

    await expect(findLyrics('foreign-bs')).rejects.toBeInstanceOf(NotFoundError)

    expect(prisma.bandSong.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'foreign-bs', bandId: 'band-1' } })
    )
    expect(importLyricsForSong).not.toHaveBeenCalled()
  })

  it('does not write lyrics into a master song the band is not allowed to edit', async () => {
    mockBandSong({ ownerBandId: null })
    mockBand({ isPlatformAdmin: false })

    expect(await findLyrics('bs-1')).toEqual({ outcome: 'error' })
    expect(importLyricsForSong).not.toHaveBeenCalled()
  })
})
