import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    gig: {
      update: vi.fn(),
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

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { updateGig } from './actions'

beforeEach(() => vi.clearAllMocks())

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const fields: Record<string, string> = {
    id: 'gig-1',
    date: '2026-08-15',
    venueId: 'venue-1',
    amountContracted: '',
    amountPaid: '',
    notes: '',
    ...overrides,
  }
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe('updateGig', () => {
  beforeEach(() => {
    vi.mocked(prisma.gig.update).mockResolvedValue({} as never)
  })

  it('writes date and venueId along with the existing financial fields', async () => {
    const fd = buildFormData({
      amountContracted: '500',
      amountPaid: '250',
      notes: 'Bring extra cables',
    })

    await expect(updateGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/gig-1')

    expect(prisma.gig.update).toHaveBeenCalledWith({
      where: { id: 'gig-1' },
      data: {
        date: new Date('2026-08-15T12:00:00'),
        venueId: 'venue-1',
        amountContracted: 500,
        amountPaid: 250,
        notes: 'Bring extra cables',
      },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/gigs')
  })

  it('stores null for blank amount fields and notes instead of empty strings', async () => {
    const fd = buildFormData()

    await expect(updateGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/gig-1')

    expect(prisma.gig.update).toHaveBeenCalledWith({
      where: { id: 'gig-1' },
      data: expect.objectContaining({
        amountContracted: null,
        amountPaid: null,
        notes: null,
      }),
    })
  })

  it('returns a validation error and never touches the database when id is missing', async () => {
    const fd = buildFormData({ id: '' })

    const result = await updateGig(null, fd)

    expect(result).toEqual({ error: 'Gig not found.' })
    expect(prisma.gig.update).not.toHaveBeenCalled()
  })

  it('returns a validation error and never touches the database when venueId is missing', async () => {
    const fd = buildFormData({ venueId: '' })

    const result = await updateGig(null, fd)

    expect(result).toEqual({ error: 'Venue is required.' })
    expect(prisma.gig.update).not.toHaveBeenCalled()
  })

  it('returns a validation error and never touches the database when date is missing', async () => {
    const fd = buildFormData({ date: '' })

    const result = await updateGig(null, fd)

    expect(result).toEqual({ error: 'Date is required.' })
    expect(prisma.gig.update).not.toHaveBeenCalled()
  })
})
