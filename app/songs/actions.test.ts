import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    song: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
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

import prisma from '@/lib/db'
import { createSong, updateSong } from './actions'

beforeEach(() => vi.clearAllMocks())

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
})

describe('updateSong', () => {
  beforeEach(() => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue({ chartFileUrl: null } as never)
    vi.mocked(prisma.song.update).mockResolvedValue({} as never)
  })

  it('re-sanitizes lyrics on edit, stripping scripts injected since the row was created', async () => {
    const fd = buildFormData({ id: 'song-1', lyrics: '<p>Safe</p><script>alert(1)</script>' })

    await expect(updateSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: 'song-1' },
      data: expect.objectContaining({ lyrics: '<p>Safe</p>' }),
    })
  })

  it('does not discard existing formatted lyrics when unrelated fields are edited', async () => {
    const html = '<p><em>Bridge</em></p><p><mark>hold here</mark></p>'
    const fd = buildFormData({ id: 'song-1', title: 'Renamed', lyrics: html })

    await expect(updateSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: 'song-1' },
      data: expect.objectContaining({ title: 'Renamed', lyrics: html }),
    })
  })

  it('returns a validation error and never touches the database when title is blank', async () => {
    const fd = buildFormData({ id: 'song-1', title: '  ' })

    const result = await updateSong(null, fd)

    expect(result).toEqual({ error: 'Title is required.' })
    expect(prisma.song.update).not.toHaveBeenCalled()
  })

  it('replaces the full genre selection, including clearing it when nothing is checked', async () => {
    const fd = buildFormData({ id: 'song-1' })

    await expect(updateSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: 'song-1' },
      data: expect.objectContaining({ genres: { set: [] } }),
    })
  })

  it('sets the genre relation to exactly the checked ids', async () => {
    const fd = buildFormDataWithGenres(['genre-2'], { id: 'song-1' })

    await expect(updateSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: 'song-1' },
      data: expect.objectContaining({ genres: { set: [{ id: 'genre-2' }] } }),
    })
  })
})
