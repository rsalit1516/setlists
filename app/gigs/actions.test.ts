import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    gig: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    venue: {
      findUnique: vi.fn(),
    },
    setlist: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    musician: {
      findMany: vi.fn(),
    },
    gigMusician: {
      upsert: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
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
import {
  createGig,
  updateGig,
  bulkAddMusicians,
  syncGigMusicians,
  updateMusicianPayment,
  markAllMusiciansPaid,
} from './actions'

beforeEach(() => vi.clearAllMocks())

function buildFormData(overrides: Record<string, string> = {}, musicianIds: string[] = []): FormData {
  const fields: Record<string, string> = {
    id: 'gig-1',
    date: '2026-08-15',
    venueId: 'venue-1',
    startTime: '',
    endTime: '',
    amountContracted: '',
    amountPaid: '',
    paidAt: '',
    tips: '',
    otherRevenue: '',
    notes: '',
    ...overrides,
  }
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  for (const musicianId of musicianIds) fd.append('musicianIds', musicianId)
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
      paidAt: '2026-08-16',
      tips: '40',
      otherRevenue: '15',
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
        paidAt: new Date('2026-08-16T12:00:00'),
        tips: 40,
        otherRevenue: 15,
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
        paidAt: null,
        tips: null,
        otherRevenue: null,
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
    vi.mocked(prisma.venue.findUnique).mockResolvedValue({ name: 'The Jazz Club' } as never)
    vi.mocked(prisma.setlist.create).mockResolvedValue({ id: 'new-setlist-1' } as never)
    vi.mocked(prisma.setlist.findUnique).mockResolvedValue({ items: [] } as never)
  })

  it('passes startTime and endTime through to the created gig when reusing an existing setlist', async () => {
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
    expect(revalidatePath).toHaveBeenCalledWith('/gigs')
  })

  it('clones the source setlist\'s active items into a new setlist instead of pointing at the same row', async () => {
    vi.mocked(prisma.setlist.findUnique).mockResolvedValue({
      items: [
        { songId: 's-1', section: 'MAIN', setNumber: 1, order: 0, isActive: true },
        { songId: 's-2', section: 'MAIN', setNumber: 1, order: 1, isActive: true },
      ],
    } as never)
    const fd = buildFormData({ setlistId: 'setlist-1', createSetlist: '' })

    await expect(createGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/new-gig-1')

    expect(prisma.setlist.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'setlist-1' },
        include: expect.objectContaining({ items: expect.objectContaining({ where: { isActive: true } }) }),
      })
    )
    expect(prisma.setlist.create).toHaveBeenCalledWith({
      data: {
        name: 'The Jazz Club - 08-15-26',
        items: {
          create: [
            { songId: 's-1', section: 'MAIN', setNumber: 1, order: 0 },
            { songId: 's-2', section: 'MAIN', setNumber: 1, order: 1 },
          ],
        },
      },
    })
    // The new gig points at the freshly cloned setlist, never the source row.
    expect(prisma.gig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ setlistId: 'new-setlist-1' }),
    })
  })

  it('names a freshly created setlist from venue + date when not reusing one', async () => {
    const fd = buildFormData({ createSetlist: 'true' })

    await expect(createGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/new-gig-1')

    expect(prisma.setlist.create).toHaveBeenCalledWith({ data: { name: 'The Jazz Club - 08-15-26' } })
    expect(prisma.setlist.findUnique).not.toHaveBeenCalled()
  })

  it('returns a validation error and creates nothing when neither setlist option is chosen', async () => {
    const fd = buildFormData({ setlistId: '', createSetlist: '' })

    const result = await createGig(null, fd)

    expect(result).toEqual({ error: 'Please check "Create setlist" or link an existing one.' })
    expect(prisma.setlist.create).not.toHaveBeenCalled()
    expect(prisma.gig.create).not.toHaveBeenCalled()
  })

  it('stores null for blank start/end time instead of empty strings', async () => {
    const fd = buildFormData({ setlistId: 'setlist-1', createSetlist: '' })

    await expect(createGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/new-gig-1')

    expect(prisma.gig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ startTime: null, endTime: null }),
    })
  })

  it('writes amountPaid, paidAt, tips, and otherRevenue along with amountContracted', async () => {
    const fd = buildFormData({
      setlistId: 'setlist-1',
      createSetlist: '',
      amountContracted: '500',
      amountPaid: '250',
      paidAt: '2026-08-16',
      tips: '40',
      otherRevenue: '15',
    })

    await expect(createGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/new-gig-1')

    expect(prisma.gig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amountContracted: 500,
        amountPaid: 250,
        paidAt: new Date('2026-08-16T12:00:00'),
        tips: 40,
        otherRevenue: 15,
      }),
    })
  })

  it('stores null for blank amountPaid, paidAt, tips, and otherRevenue instead of empty strings', async () => {
    const fd = buildFormData({ setlistId: 'setlist-1', createSetlist: '' })

    await expect(createGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/new-gig-1')

    expect(prisma.gig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amountPaid: null,
        paidAt: null,
        tips: null,
        otherRevenue: null,
      }),
    })
  })

  it('creates a GigMusician row for each musicianId checked on the form', async () => {
    const fd = buildFormData({ setlistId: 'setlist-1', createSetlist: '' }, ['m-1', 'm-2'])

    await expect(createGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/new-gig-1')

    expect(prisma.gigMusician.createMany).toHaveBeenCalledWith({
      data: [
        { gigId: 'new-gig-1', musicianId: 'm-1' },
        { gigId: 'new-gig-1', musicianId: 'm-2' },
      ],
    })
  })

  it('skips the GigMusician bulk-create when no musicians are checked', async () => {
    const fd = buildFormData({ setlistId: 'setlist-1', createSetlist: '' })

    await expect(createGig(null, fd)).rejects.toThrow('REDIRECT:/gigs/new-gig-1')

    expect(prisma.gigMusician.createMany).not.toHaveBeenCalled()
  })
})

describe('bulkAddMusicians', () => {
  it('upserts a GigMusician for each checked musician', async () => {
    vi.mocked(prisma.gigMusician.upsert).mockResolvedValue({} as never)
    const fd = new FormData()
    fd.set('gigId', 'gig-1')
    fd.append('musicianIds', 'musician-1')
    fd.append('musicianIds', 'musician-2')

    await bulkAddMusicians(fd)

    // upsert (not create): a musician previously removed from this gig leaves an
    // inactive row behind that still occupies the @@unique([gigId, musicianId])
    // slot, so re-adding them must reactivate it instead of inserting a duplicate.
    expect(prisma.gigMusician.upsert).toHaveBeenCalledWith({
      where: { gigId_musicianId: { gigId: 'gig-1', musicianId: 'musician-1' } },
      create: { gigId: 'gig-1', musicianId: 'musician-1' },
      update: { isActive: true },
    })
    expect(prisma.gigMusician.upsert).toHaveBeenCalledWith({
      where: { gigId_musicianId: { gigId: 'gig-1', musicianId: 'musician-2' } },
      create: { gigId: 'gig-1', musicianId: 'musician-2' },
      update: { isActive: true },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/gigs/gig-1')
  })

  it('does nothing when no musicians are checked', async () => {
    const fd = new FormData()
    fd.set('gigId', 'gig-1')

    await bulkAddMusicians(fd)

    expect(prisma.gigMusician.upsert).not.toHaveBeenCalled()
  })

  it('does nothing when gigId is missing', async () => {
    const fd = new FormData()
    fd.append('musicianIds', 'musician-1')

    await bulkAddMusicians(fd)

    expect(prisma.gigMusician.upsert).not.toHaveBeenCalled()
  })
})

describe('syncGigMusicians', () => {
  it('upserts newly checked musicians and deactivates newly unchecked ones', async () => {
    vi.mocked(prisma.gigMusician.findMany).mockResolvedValue([
      { id: 'gm-1', musicianId: 'm-1' },
      { id: 'gm-2', musicianId: 'm-2' },
    ] as never)
    vi.mocked(prisma.gigMusician.upsert).mockResolvedValue({} as never)
    vi.mocked(prisma.gigMusician.updateMany).mockResolvedValue({ count: 1 } as never)
    const fd = new FormData()
    fd.set('gigId', 'gig-1')
    fd.append('musicianIds', 'm-1')
    fd.append('musicianIds', 'm-3')

    await syncGigMusicians(fd)

    expect(prisma.gigMusician.findMany).toHaveBeenCalledWith({
      where: { gigId: 'gig-1', isActive: true },
      select: { id: true, musicianId: true },
    })
    // m-1 stays checked (no-op besides reactivation upsert), m-3 is newly checked.
    expect(prisma.gigMusician.upsert).toHaveBeenCalledWith({
      where: { gigId_musicianId: { gigId: 'gig-1', musicianId: 'm-3' } },
      create: { gigId: 'gig-1', musicianId: 'm-3' },
      update: { isActive: true },
    })
    // m-2 was active but unchecked on submit, so it's soft-removed.
    expect(prisma.gigMusician.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['gm-2'] } },
      data: { isActive: false },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/gigs/gig-1')
  })

  it('skips the deactivate call when nothing was unchecked', async () => {
    vi.mocked(prisma.gigMusician.findMany).mockResolvedValue([
      { id: 'gm-1', musicianId: 'm-1' },
    ] as never)
    const fd = new FormData()
    fd.set('gigId', 'gig-1')
    fd.append('musicianIds', 'm-1')

    await syncGigMusicians(fd)

    expect(prisma.gigMusician.updateMany).not.toHaveBeenCalled()
    expect(prisma.gigMusician.upsert).not.toHaveBeenCalled()
  })

  it('deactivates every current musician when all boxes are unchecked', async () => {
    vi.mocked(prisma.gigMusician.findMany).mockResolvedValue([
      { id: 'gm-1', musicianId: 'm-1' },
      { id: 'gm-2', musicianId: 'm-2' },
    ] as never)
    const fd = new FormData()
    fd.set('gigId', 'gig-1')

    await syncGigMusicians(fd)

    expect(prisma.gigMusician.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['gm-1', 'gm-2'] } },
      data: { isActive: false },
    })
  })

  it('does nothing when gigId is missing', async () => {
    const fd = new FormData()
    fd.append('musicianIds', 'm-1')

    await syncGigMusicians(fd)

    expect(prisma.gigMusician.findMany).not.toHaveBeenCalled()
  })
})

describe('updateMusicianPayment', () => {
  beforeEach(() => {
    vi.mocked(prisma.gigMusician.update).mockResolvedValue({ gigId: 'gig-1' } as never)
  })

  it('writes amountPaid and paidAt for the given GigMusician row', async () => {
    const fd = new FormData()
    fd.set('gigMusicianId', 'gm-1')
    fd.set('amountPaid', '150')
    fd.set('paidAt', '2026-08-20')

    await updateMusicianPayment(fd)

    expect(prisma.gigMusician.update).toHaveBeenCalledWith({
      where: { id: 'gm-1' },
      data: { amountPaid: 150, paidAt: new Date('2026-08-20T12:00:00') },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/gigs/gig-1')
  })

  it('stores null for blank amount and date instead of empty strings', async () => {
    const fd = new FormData()
    fd.set('gigMusicianId', 'gm-1')
    fd.set('amountPaid', '')
    fd.set('paidAt', '')

    await updateMusicianPayment(fd)

    expect(prisma.gigMusician.update).toHaveBeenCalledWith({
      where: { id: 'gm-1' },
      data: { amountPaid: null, paidAt: null },
    })
  })

  it('does nothing when gigMusicianId is missing', async () => {
    const fd = new FormData()
    fd.set('amountPaid', '150')

    await updateMusicianPayment(fd)

    expect(prisma.gigMusician.update).not.toHaveBeenCalled()
  })
})

describe('markAllMusiciansPaid', () => {
  const mockGigRow = {
    id: 'gig-1',
    date: new Date('2026-08-15'),
    notes: null,
    amountContracted: '500.00',
    amountPaid: '400.00',
    paidAt: null,
    tips: '50.00',
    otherRevenue: null,
    venueId: 'venue-1',
    setlistId: 'setlist-1',
    venue: { id: 'venue-1', name: 'Test Venue', address: null, notes: null, createdAt: new Date(), updatedAt: new Date() },
    setlist: { id: 'setlist-1', name: 'Test Setlist', items: [] },
    expenses: [{ id: 'e-1', description: 'Gas', amount: '50.00', gigId: 'gig-1', isActive: true, createdAt: new Date() }],
    musicians: [
      { id: 'gm-1', musicianId: 'm-1', musician: { id: 'm-1', name: 'A' }, amountPaid: null, paidAt: null, gigId: 'gig-1', isActive: true, createdAt: new Date() },
      { id: 'gm-2', musicianId: 'm-2', musician: { id: 'm-2', name: 'B' }, amountPaid: null, paidAt: null, gigId: 'gig-1', isActive: true, createdAt: new Date() },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it("splits the gig's current net evenly across active musicians and stamps the chosen date", async () => {
    // net = amountPaid(400) + tips(50) + otherRevenue(0) - expenses(50) = 400, split across 2 musicians = 200
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(mockGigRow as never)
    vi.mocked(prisma.gigMusician.updateMany).mockResolvedValue({ count: 2 } as never)
    const fd = new FormData()
    fd.set('gigId', 'gig-1')
    fd.set('paidAt', '2026-08-20')

    await markAllMusiciansPaid(fd)

    expect(prisma.gigMusician.updateMany).toHaveBeenCalledWith({
      where: { gigId: 'gig-1', isActive: true },
      data: { amountPaid: 200, paidAt: new Date('2026-08-20T12:00:00') },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/gigs/gig-1')
  })

  it('does nothing when the gig has no active musicians', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue({ ...mockGigRow, musicians: [] } as never)
    const fd = new FormData()
    fd.set('gigId', 'gig-1')
    fd.set('paidAt', '2026-08-20')

    await markAllMusiciansPaid(fd)

    expect(prisma.gigMusician.updateMany).not.toHaveBeenCalled()
  })

  it('does nothing when paidAt is missing', async () => {
    const fd = new FormData()
    fd.set('gigId', 'gig-1')

    await markAllMusiciansPaid(fd)

    expect(prisma.gig.findUnique).not.toHaveBeenCalled()
    expect(prisma.gigMusician.updateMany).not.toHaveBeenCalled()
  })

  it('does nothing when the gig does not exist', async () => {
    vi.mocked(prisma.gig.findUnique).mockResolvedValue(null)
    const fd = new FormData()
    fd.set('gigId', 'nonexistent')
    fd.set('paidAt', '2026-08-20')

    await markAllMusiciansPaid(fd)

    expect(prisma.gigMusician.updateMany).not.toHaveBeenCalled()
  })
})
