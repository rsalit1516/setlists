import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    venue: {
      create: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createVenue } from './actions'

beforeEach(() => vi.clearAllMocks())

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
