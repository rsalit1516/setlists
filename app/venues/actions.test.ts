import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    venue: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

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
import { createVenue, updateVenue, deleteVenue } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isOwned).mockResolvedValue(true)
  vi.mocked(areOwned).mockResolvedValue(true)
  vi.mocked(assertOwned).mockResolvedValue(undefined)
})

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const fields: Record<string, string> = {
    name: 'The Fillmore',
    address: '1805 Geary Blvd',
    notes: '',
    ...overrides,
  }
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe('createVenue', () => {
  it('creates a venue stamped with the band and redirects to the list', async () => {
    vi.mocked(prisma.venue.create).mockResolvedValue({} as never)

    await expect(createVenue(null, buildFormData({ name: '  The Fillmore  ' }))).rejects.toThrow('REDIRECT:/venues')

    expect(prisma.venue.create).toHaveBeenCalledWith({
      data: { name: 'The Fillmore', address: '1805 Geary Blvd', notes: null, bandId: '01900000-0000-7000-8000-000000000001' },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/venues')
  })

  it('returns a validation error and never touches the database when name is blank', async () => {
    const result = await createVenue(null, buildFormData({ name: '   ' }))

    expect(result).toEqual({ error: 'Name is required.' })
    expect(prisma.venue.create).not.toHaveBeenCalled()
  })
})

describe('updateVenue', () => {
  it('updates an owned venue and redirects to the list', async () => {
    vi.mocked(prisma.venue.update).mockResolvedValue({} as never)

    await expect(updateVenue(null, buildFormData({ id: 'venue-1' }))).rejects.toThrow('REDIRECT:/venues')

    expect(prisma.venue.update).toHaveBeenCalledWith({
      where: { id: 'venue-1' },
      data: { name: 'The Fillmore', address: '1805 Geary Blvd', notes: null },
    })
  })
})

describe('band ownership', () => {
  const BAND = '01900000-0000-7000-8000-000000000001'

  it("updateVenue returns \"not found\" for another band's venue without writing", async () => {
    vi.mocked(isOwned).mockResolvedValue(false)

    const result = await updateVenue(null, buildFormData({ id: 'foreign-v' }))

    expect(result).toEqual({ error: 'Venue not found.' })
    expect(isOwned).toHaveBeenCalledWith('venue', BAND, 'foreign-v')
    expect(prisma.venue.update).not.toHaveBeenCalled()
  })

  it("deleteVenue rejects another band's venue without writing", async () => {
    vi.mocked(assertOwned).mockRejectedValue(new NotFoundError('venue'))

    await expect(deleteVenue('foreign-v')).rejects.toBeInstanceOf(NotFoundError)

    expect(assertOwned).toHaveBeenCalledWith('venue', BAND, 'foreign-v')
    expect(prisma.venue.update).not.toHaveBeenCalled()
  })
})
