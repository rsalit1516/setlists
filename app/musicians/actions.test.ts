import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    musician: {
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

vi.mock('@/lib/ownership', async () => ({
  ...(await vi.importActual<typeof import('@/lib/ownership')>('@/lib/ownership')),
  isOwned: vi.fn(),
  areOwned: vi.fn(),
  assertOwned: vi.fn(),
}))

import prisma from '@/lib/db'
import { isOwned, areOwned, assertOwned, NotFoundError } from '@/lib/ownership'
import { revalidatePath } from 'next/cache'
import { createMusician, updateMusician, deleteMusician } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isOwned).mockResolvedValue(true)
  vi.mocked(areOwned).mockResolvedValue(true)
  vi.mocked(assertOwned).mockResolvedValue(undefined)
})

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const fields: Record<string, string> = {
    id: 'musician-1',
    name: 'Richard Salit',
    ...overrides,
  }
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe('createMusician', () => {
  it('creates a musician with the trimmed name and redirects to the roster', async () => {
    vi.mocked(prisma.musician.create).mockResolvedValue({} as never)
    const fd = buildFormData({ name: '  Richard Salit  ' })

    await expect(createMusician(null, fd)).rejects.toThrow('REDIRECT:/musicians')

    expect(prisma.musician.create).toHaveBeenCalledWith({
      data: { name: 'Richard Salit', bandId: '01900000-0000-7000-8000-000000000001' },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/musicians')
  })

  it('returns a validation error and never touches the database when name is blank', async () => {
    const fd = buildFormData({ name: '   ' })

    const result = await createMusician(null, fd)

    expect(result).toEqual({ error: 'Name is required.' })
    expect(prisma.musician.create).not.toHaveBeenCalled()
  })

  it('returns a friendly error instead of throwing when the database write fails', async () => {
    vi.mocked(prisma.musician.create).mockRejectedValue(new Error('unique constraint'))
    const fd = buildFormData()

    const result = await createMusician(null, fd)

    expect(result).toEqual({ error: 'Failed to create musician.' })
  })
})

describe('updateMusician', () => {
  it('updates the musician and redirects to the roster', async () => {
    vi.mocked(prisma.musician.update).mockResolvedValue({} as never)
    const fd = buildFormData({ name: 'Rich Salit' })

    await expect(updateMusician(null, fd)).rejects.toThrow('REDIRECT:/musicians')

    expect(prisma.musician.update).toHaveBeenCalledWith({
      where: { id: 'musician-1' },
      data: { name: 'Rich Salit' },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/musicians')
  })

  it('returns a validation error and never touches the database when name is blank', async () => {
    const fd = buildFormData({ name: '' })

    const result = await updateMusician(null, fd)

    expect(result).toEqual({ error: 'Name is required.' })
    expect(prisma.musician.update).not.toHaveBeenCalled()
  })
})

describe('deleteMusician', () => {
  it('soft-deletes the musician via isActive and revalidates the roster', async () => {
    vi.mocked(prisma.musician.update).mockResolvedValue({} as never)

    await deleteMusician('musician-1')

    expect(prisma.musician.update).toHaveBeenCalledWith({
      where: { id: 'musician-1' },
      data: { isActive: false },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/musicians')
  })
})

describe('band ownership', () => {
  const BAND = '01900000-0000-7000-8000-000000000001'

  it("updateMusician returns \"not found\" for another band's musician without writing", async () => {
    vi.mocked(isOwned).mockResolvedValue(false)

    const result = await updateMusician(null, buildFormData({ id: 'foreign-m' }))

    expect(result).toEqual({ error: 'Musician not found.' })
    expect(isOwned).toHaveBeenCalledWith('musician', BAND, 'foreign-m')
    expect(prisma.musician.update).not.toHaveBeenCalled()
  })

  it("deleteMusician rejects another band's musician without writing", async () => {
    vi.mocked(assertOwned).mockRejectedValue(new NotFoundError('musician'))

    await expect(deleteMusician('foreign-m')).rejects.toBeInstanceOf(NotFoundError)

    expect(assertOwned).toHaveBeenCalledWith('musician', BAND, 'foreign-m')
    expect(prisma.musician.update).not.toHaveBeenCalled()
  })
})
