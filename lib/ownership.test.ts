import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    gig: { count: vi.fn() },
    setlist: { count: vi.fn() },
    venue: { count: vi.fn() },
    musician: { count: vi.fn() },
    bandSong: { count: vi.fn() },
    song: { count: vi.fn() },
    expense: { count: vi.fn() },
    gigMusician: { count: vi.fn() },
    setlistItem: { count: vi.fn() },
  },
}))

import prisma from '@/lib/db'
import { areOwned, isOwned, assertOwned, NotFoundError } from './ownership'

beforeEach(() => vi.clearAllMocks())

describe('ownership', () => {
  it.each([
    ['gig', 'gig', { id: { in: ['x'] }, bandId: 'band-1' }],
    ['setlist', 'setlist', { id: { in: ['x'] }, bandId: 'band-1' }],
    ['venue', 'venue', { id: { in: ['x'] }, bandId: 'band-1' }],
    ['musician', 'musician', { id: { in: ['x'] }, bandId: 'band-1' }],
    ['bandSong', 'bandSong', { id: { in: ['x'] }, bandId: 'band-1' }],
    [
      'song',
      'song',
      { id: { in: ['x'] }, isActive: true, OR: [{ ownerBandId: null }, { ownerBandId: 'band-1' }] },
    ],
    ['expense', 'expense', { id: { in: ['x'] }, gig: { bandId: 'band-1' } }],
    ['gigMusician', 'gigMusician', { id: { in: ['x'] }, gig: { bandId: 'band-1' } }],
    ['setlistItem', 'setlistItem', { id: { in: ['x'] }, setlist: { bandId: 'band-1' } }],
  ] as const)('%s is resolved through its band', async (entity, model, where) => {
    vi.mocked(prisma[model].count).mockResolvedValue(1 as never)
    expect(await isOwned(entity, 'band-1', 'x')).toBe(true)
    expect(prisma[model].count).toHaveBeenCalledWith({ where })
  })

  it('is false when the row belongs to another band (count comes back 0)', async () => {
    vi.mocked(prisma.gig.count).mockResolvedValue(0)
    expect(await isOwned('gig', 'band-2', 'gig-1')).toBe(false)
  })

  it('requires every id to be owned, ignoring duplicates', async () => {
    vi.mocked(prisma.musician.count).mockResolvedValue(2)
    expect(await areOwned('musician', 'band-1', ['a', 'b', 'a'])).toBe(true)
    expect(prisma.musician.count).toHaveBeenCalledWith({ where: { id: { in: ['a', 'b'] }, bandId: 'band-1' } })

    vi.mocked(prisma.musician.count).mockResolvedValue(1)
    expect(await areOwned('musician', 'band-1', ['a', 'b'])).toBe(false)
  })

  it('treats an empty id list as owned without querying', async () => {
    expect(await areOwned('musician', 'band-1', [])).toBe(true)
    expect(prisma.musician.count).not.toHaveBeenCalled()
  })

  it('assertOwned throws NotFoundError for a foreign id and passes for an owned one', async () => {
    vi.mocked(prisma.venue.count).mockResolvedValue(0)
    await expect(assertOwned('venue', 'band-1', 'v-1')).rejects.toBeInstanceOf(NotFoundError)

    vi.mocked(prisma.venue.count).mockResolvedValue(1)
    await expect(assertOwned('venue', 'band-1', 'v-1')).resolves.toBeUndefined()
  })
})
