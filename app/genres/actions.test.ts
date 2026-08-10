import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    genre: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Mirrors Next.js's real redirect(): it throws to unwind the action, so
// "nothing runs after redirect" (per CLAUDE.md) is true in tests too.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createGenre, updateGenre, deactivateGenre } from './actions'

beforeEach(() => vi.clearAllMocks())

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const fields: Record<string, string> = {
    id: 'genre-1',
    name: 'Funk',
    ...overrides,
  }
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe('createGenre', () => {
  it('creates a genre with the trimmed name and redirects to the directory', async () => {
    vi.mocked(prisma.genre.create).mockResolvedValue({} as never)
    const fd = buildFormData({ name: '  Funk  ' })

    await expect(createGenre(null, fd)).rejects.toThrow('REDIRECT:/genres')

    expect(prisma.genre.create).toHaveBeenCalledWith({ data: { name: 'Funk' } })
    expect(revalidatePath).toHaveBeenCalledWith('/genres')
  })

  it('returns a validation error and never touches the database when name is blank', async () => {
    const fd = buildFormData({ name: '   ' })

    const result = await createGenre(null, fd)

    expect(result).toEqual({ error: 'Name is required.' })
    expect(prisma.genre.create).not.toHaveBeenCalled()
  })

  it('returns a friendly error instead of throwing when the name is already taken', async () => {
    vi.mocked(prisma.genre.create).mockRejectedValue(new Error('unique constraint'))
    const fd = buildFormData()

    const result = await createGenre(null, fd)

    expect(result).toEqual({
      error: 'Failed to create genre. A genre with this name may already exist.',
    })
  })
})

describe('updateGenre', () => {
  it('updates the genre name and redirects to the directory', async () => {
    vi.mocked(prisma.genre.update).mockResolvedValue({} as never)
    const fd = buildFormData({ name: 'Funk / Jam' })

    await expect(updateGenre(null, fd)).rejects.toThrow('REDIRECT:/genres')

    expect(prisma.genre.update).toHaveBeenCalledWith({
      where: { id: 'genre-1' },
      data: { name: 'Funk / Jam' },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/genres')
    expect(revalidatePath).toHaveBeenCalledWith('/songs')
  })

  it('returns a validation error and never touches the database when name is blank', async () => {
    const fd = buildFormData({ name: '' })

    const result = await updateGenre(null, fd)

    expect(result).toEqual({ error: 'Name is required.' })
    expect(prisma.genre.update).not.toHaveBeenCalled()
  })
})

describe('deactivateGenre', () => {
  it('soft-deletes the genre and strips it from every song in the same write', async () => {
    vi.mocked(prisma.genre.update).mockResolvedValue({} as never)

    await deactivateGenre('genre-1')

    expect(prisma.genre.update).toHaveBeenCalledWith({
      where: { id: 'genre-1' },
      data: { isActive: false, songs: { set: [] } },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/genres')
    expect(revalidatePath).toHaveBeenCalledWith('/songs')
  })
})
