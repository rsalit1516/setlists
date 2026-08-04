import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    gig: {
      create: vi.fn(),
      update: vi.fn(),
    },
    venue: {
      findUnique: vi.fn(),
    },
    setlist: {
      create: vi.fn(),
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
import { createGig, updateGig } from './actions'

beforeEach(() => vi.clearAllMocks())

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const fields: Record<string, string> = {
    id: 'gig-1',
    date: '2026-08-15',
    venueId: 'venue-1',
    startTime: '',
    endTime: '',
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

  it('writes date, startTime, endTime, and venueId along with the existing financial fields', async () => {
    const fd = buildFormData({
      startTime: '19:00',
      endTime: '22:30',
      amountContracted: '500',
      amountPaid: '250',
      notes: 'Bring extra cables',
    })

    await expect(updateGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/gig-1')

    expect(prisma.gig.update).toHaveBeenCalledWith({
      where: { id: 'gig-1' },
      data: {
        date: new Date('2026-08-15T12:00:00'),
        startTime: '19:00',
        endTime: '22:30',
        venueId: 'venue-1',
        amountContracted: 500,
        amountPaid: 250,
        notes: 'Bring extra cables',
      },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/gigs')
  })

  it('stores null for blank amount fields, notes, and time fields instead of empty strings', async () => {
    const fd = buildFormData()

    await expect(updateGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/gig-1')

    expect(prisma.gig.update).toHaveBeenCalledWith({
      where: { id: 'gig-1' },
      data: expect.objectContaining({
        startTime: null,
        endTime: null,
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

describe('createGig', () => {
  beforeEach(() => {
    vi.mocked(prisma.gig.create).mockResolvedValue({ id: 'new-gig-1' } as never)
  })

  it('passes startTime and endTime through to the created gig when linking an existing setlist', async () => {
    const fd = buildFormData({
      setlistId: 'setlist-1',
      createSetlist: '',
      startTime: '19:00',
      endTime: '22:30',
    })

    await expect(createGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/new-gig-1')

    expect(prisma.gig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        startTime: '19:00',
        endTime: '22:30',
      }),
    })
    expect(prisma.venue.findUnique).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/gigs')
  })

  it('stores null for blank start/end time instead of empty strings', async () => {
    const fd = buildFormData({ setlistId: 'setlist-1', createSetlist: '' })

    await expect(createGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/new-gig-1')

    expect(prisma.gig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ startTime: null, endTime: null }),
    })
  })
})
