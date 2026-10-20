import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSetlists, getSetlist } from './setlists'

vi.mock('@/lib/db', () => ({
  default: {
    setlist: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'

const mockSetlist = {
  id: 'sl-1',
  name: 'Friday Night',
  createdAt: new Date('2026-05-15'),
  updatedAt: new Date('2026-05-15'),
  items: [],
  gig: null,
  _count: { items: 0 },
}

beforeEach(() => vi.clearAllMocks())

describe('getSetlists', () => {
  it("returns the band's setlists ordered by createdAt desc", async () => {
    vi.mocked(prisma.setlist.findMany).mockResolvedValue([mockSetlist] as never)
    const result = await getSetlists('band-1')
    expect(result).toHaveLength(1)
    expect(prisma.setlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bandId: 'band-1', isActive: true },
        orderBy: { createdAt: 'desc' },
      })
    )
  })

  it("includes each setlist's linked gig (with venue) so the copy-from picker can show it", async () => {
    const withGig = {
      ...mockSetlist,
      id: 'sl-2',
      gig: { id: 'gig-1', date: new Date('2026-05-20'), venue: { name: 'The Vault' } },
    }
    vi.mocked(prisma.setlist.findMany).mockResolvedValue([withGig] as never)

    const result = await getSetlists('band-1')

    expect(result[0].gig).toEqual({
      id: 'gig-1',
      date: new Date('2026-05-20'),
      venue: { name: 'The Vault' },
    })
    expect(prisma.setlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          gig: expect.objectContaining({ include: { venue: true } }),
        }),
      })
    )
  })

  it('returns empty array when no setlists exist', async () => {
    vi.mocked(prisma.setlist.findMany).mockResolvedValue([])
    expect(await getSetlists('band-1')).toEqual([])
  })
})

describe('getSetlist', () => {
  it('returns the setlist with items when found in the band', async () => {
    vi.mocked(prisma.setlist.findFirst).mockResolvedValue(mockSetlist as never)
    const result = await getSetlist('band-1', 'sl-1')
    expect(result).toEqual(mockSetlist)
    expect(prisma.setlist.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sl-1', bandId: 'band-1' } })
    )
  })

  it("resolves each item's song through its BandSong, keeping the BandSong id as songId", async () => {
    const updatedAt = new Date('2026-05-01')
    vi.mocked(prisma.setlist.findFirst).mockResolvedValue({
      ...mockSetlist,
      items: [
        {
          id: 'item-1',
          order: 0,
          bandSongId: 'bs-1',
          songId: 'legacy-song-id',
          bandSong: {
            id: 'bs-1',
            status: 'READY',
            singer: 'Dana',
            keyboardRequired: true,
            isActive: true,
            updatedAt,
            song: { id: 'song-1', title: 'Wonderwall', key: 'F#m', isActive: true, updatedAt },
          },
        },
      ],
    } as never)

    const result = await getSetlist('band-1', 'sl-1')

    const item = result?.items[0]
    expect(item?.songId).toBe('bs-1')
    expect(item?.song).toMatchObject({ id: 'bs-1', title: 'Wonderwall', key: 'F#m', singer: 'Dana', keyboardRequired: true })
    expect(item).not.toHaveProperty('bandSong')
    expect(prisma.setlist.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          items: expect.objectContaining({ include: { bandSong: { include: { song: true } } } }),
        }),
      })
    )
  })

  it('returns null when setlist does not exist or belongs to another band', async () => {
    vi.mocked(prisma.setlist.findFirst).mockResolvedValue(null)
    expect(await getSetlist('band-2', 'sl-1')).toBeNull()
    expect(prisma.setlist.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sl-1', bandId: 'band-2' } })
    )
  })
})
