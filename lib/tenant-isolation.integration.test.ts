// Unlike the mocked unit tests, this runs the real services and server actions against a real
// Postgres with two bands in it, so a missing `where: { bandId }` actually shows up.
//
// It only runs when TENANT_TEST_DATABASE_URL is set, and refuses anything but a local database
// because it inserts and deletes rows. See docs/tenant-isolation-tests.md.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

const url = process.env.TENANT_TEST_DATABASE_URL
const host = url ? new URL(url).hostname : null
if (url && host !== 'localhost' && host !== '127.0.0.1') {
  throw new Error(`Refusing to run tenant-isolation tests against ${host}: only localhost is allowed.`)
}
if (url) process.env.DATABASE_URL = url

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`)
  }),
}))

// "Our" band is whatever getBandContext() returns; the other band is created here.
const OTHER_BAND = '01900000-0000-7000-8000-0000000000e1'
const P = 'iso-'
// Jan 1 of this year: always in the past, and always in the finance report's current-year bucket.
const GIG_DATE = new Date(new Date().getFullYear(), 0, 1, 12)

describe.skipIf(!url)('tenant isolation (real database)', () => {
  let prisma: typeof import('@/lib/db').default
  let ourBand: string
  let services: {
    gigs: typeof import('@/lib/services/gigs')
    venues: typeof import('@/lib/services/venues')
    musicians: typeof import('@/lib/services/musicians')
    setlists: typeof import('@/lib/services/setlists')
    finance: typeof import('@/lib/services/finance')
    stats: typeof import('@/lib/services/stats')
  }
  let gigActions: typeof import('@/app/gigs/actions')
  let setlistActions: typeof import('@/app/setlists/actions')
  let venueActions: typeof import('@/app/venues/actions')
  let musicianActions: typeof import('@/app/musicians/actions')
  let ownership: typeof import('@/lib/ownership')

  async function seedBand(bandId: string, tag: string, withPlay: boolean) {
    await prisma.venue.create({ data: { id: `${P}venue-${tag}`, name: `Venue ${tag}`, bandId } })
    await prisma.musician.create({ data: { id: `${P}musician-${tag}`, name: `Isolation Musician ${tag}`, bandId } })
    await prisma.setlist.create({ data: { id: `${P}setlist-${tag}`, name: `Setlist ${tag}`, bandId } })
    await prisma.gig.create({
      data: {
        id: `${P}gig-${tag}`,
        date: GIG_DATE,
        amountContracted: 400,
        bandId,
        venueId: `${P}venue-${tag}`,
        setlistId: `${P}setlist-${tag}`,
      },
    })
    await prisma.expense.create({ data: { id: `${P}expense-${tag}`, description: 'Parking', amount: 20, gigId: `${P}gig-${tag}` } })
    await prisma.gigMusician.create({
      data: { id: `${P}gm-${tag}`, gigId: `${P}gig-${tag}`, musicianId: `${P}musician-${tag}` },
    })
    await prisma.setlistItem.create({
      data: {
        id: `${P}item-${tag}`,
        order: 0,
        section: 'MAIN',
        wasPlayed: withPlay,
        songId: `${P}song-${tag}`,
        setlistId: `${P}setlist-${tag}`,
      },
    })
  }

  async function cleanup() {
    await prisma.setlistItem.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.gigMusician.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.expense.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.gig.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.setlist.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.musician.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.venue.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.song.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.band.deleteMany({ where: { id: OTHER_BAND } })
  }

  beforeAll(async () => {
    prisma = (await import('@/lib/db')).default
    ourBand = (await (await import('@/lib/band')).getBandContext()).bandId
    services = {
      gigs: await import('@/lib/services/gigs'),
      venues: await import('@/lib/services/venues'),
      musicians: await import('@/lib/services/musicians'),
      setlists: await import('@/lib/services/setlists'),
      finance: await import('@/lib/services/finance'),
      stats: await import('@/lib/services/stats'),
    }
    gigActions = await import('@/app/gigs/actions')
    setlistActions = await import('@/app/setlists/actions')
    venueActions = await import('@/app/venues/actions')
    musicianActions = await import('@/app/musicians/actions')
    ownership = await import('@/lib/ownership')

    await cleanup()
    await prisma.band.upsert({
      where: { id: ourBand },
      update: {},
      create: { id: ourBand, name: 'Isolation Test Band' },
    })
    await prisma.band.create({ data: { id: OTHER_BAND, name: 'Isolation Other Band' } })
    await prisma.song.create({ data: { id: `${P}song-ours`, title: 'Ours Only Song' } })
    await prisma.song.create({ data: { id: `${P}song-theirs`, title: 'Theirs Only Song' } })
    await seedBand(ourBand, 'ours', true)
    await seedBand(OTHER_BAND, 'theirs', true)
  })

  afterAll(async () => {
    if (prisma) {
      await cleanup()
      await prisma.$disconnect()
    }
  })

  it('control: an unscoped query sees both bands, so the fixture really contains the other band', async () => {
    const gigIds = (await prisma.gig.findMany({ where: { id: { startsWith: P } } })).map((g) => g.id)
    expect(gigIds).toEqual(expect.arrayContaining([`${P}gig-ours`, `${P}gig-theirs`]))
    const venueIds = (await prisma.venue.findMany({ where: { id: { startsWith: P } } })).map((v) => v.id)
    expect(venueIds).toEqual(expect.arrayContaining([`${P}venue-ours`, `${P}venue-theirs`]))
  })

  describe('reads only return our band', () => {
    it('gigs', async () => {
      const ids = (await services.gigs.getGigs(ourBand)).map((g) => g.id)
      expect(ids).toContain(`${P}gig-ours`)
      expect(ids).not.toContain(`${P}gig-theirs`)
      expect(await services.gigs.getGig(ourBand, `${P}gig-theirs`)).toBeNull()
      expect(await services.gigs.getGig(ourBand, `${P}gig-ours`)).not.toBeNull()
      expect(await services.gigs.getGigForPerformance(ourBand, `${P}gig-theirs`)).toBeNull()
      const dayStart = new Date(GIG_DATE.getFullYear(), 0, 1)
      const dayEnd = new Date(GIG_DATE.getFullYear(), 0, 2)
      const range = (await services.gigs.getGigsInRange(ourBand, dayStart, dayEnd)).map((g) => g.id)
      expect(range).toContain(`${P}gig-ours`)
      expect(range).not.toContain(`${P}gig-theirs`)
    })

    it('venues, musicians and setlists, including lookups by id', async () => {
      expect((await services.venues.getVenues(ourBand)).map((v) => v.id)).not.toContain(`${P}venue-theirs`)
      expect(await services.venues.getVenue(ourBand, `${P}venue-theirs`)).toBeNull()
      expect((await services.musicians.getMusicians(ourBand)).map((m) => m.id)).not.toContain(`${P}musician-theirs`)
      expect(await services.musicians.getMusician(ourBand, `${P}musician-theirs`)).toBeNull()
      expect((await services.setlists.getSetlists(ourBand)).map((s) => s.id)).not.toContain(`${P}setlist-theirs`)
      expect(await services.setlists.getSetlist(ourBand, `${P}setlist-theirs`)).toBeNull()
    })

    it('finance and stats', async () => {
      const report = await services.finance.getFinanceReport(ourBand)
      const financeIds = report.currentYearGigs.map((g) => g.id)
      expect(financeIds).toContain(`${P}gig-ours`)
      expect(financeIds).not.toContain(`${P}gig-theirs`)

      const unpaid = (await services.stats.getUnpaidGigs(ourBand)).map((g) => g.id)
      expect(unpaid).toContain(`${P}gig-ours`)
      expect(unpaid).not.toContain(`${P}gig-theirs`)

      const mostPlayed = (await services.stats.getMostPlayedSongs(ourBand, 50)).map((s) => s.songId)
      expect(mostPlayed).toContain(`${P}song-ours`)
      expect(mostPlayed).not.toContain(`${P}song-theirs`)
    })
  })

  describe('ownership helpers', () => {
    it("treat the other band's rows as not owned", async () => {
      expect(await ownership.isOwned('gig', ourBand, `${P}gig-ours`)).toBe(true)
      expect(await ownership.isOwned('gig', ourBand, `${P}gig-theirs`)).toBe(false)
      expect(await ownership.isOwned('expense', ourBand, `${P}expense-theirs`)).toBe(false)
      expect(await ownership.isOwned('gigMusician', ourBand, `${P}gm-theirs`)).toBe(false)
      expect(await ownership.isOwned('setlistItem', ourBand, `${P}item-theirs`)).toBe(false)
      expect(await ownership.areOwned('musician', ourBand, [`${P}musician-ours`, `${P}musician-theirs`])).toBe(false)
    })
  })

  describe("mutations cannot touch the other band's rows", () => {
    const form = (fields: Record<string, string>) => {
      const fd = new FormData()
      for (const [k, v] of Object.entries(fields)) fd.set(k, v)
      return fd
    }

    it('deleteGig, removeExpense, removeMusician and removeItem throw and leave the rows alone', async () => {
      const { NotFoundError } = ownership
      await expect(gigActions.deleteGig(`${P}gig-theirs`)).rejects.toBeInstanceOf(NotFoundError)
      await expect(gigActions.removeExpense(`${P}expense-theirs`)).rejects.toBeInstanceOf(NotFoundError)
      await expect(gigActions.removeMusician(`${P}gm-theirs`)).rejects.toBeInstanceOf(NotFoundError)
      await expect(setlistActions.removeItem(`${P}item-theirs`)).rejects.toBeInstanceOf(NotFoundError)
      await expect(setlistActions.togglePlayed(`${P}item-theirs`, true)).rejects.toBeInstanceOf(NotFoundError)

      expect((await prisma.gig.findUnique({ where: { id: `${P}gig-theirs` } }))?.isActive).toBe(true)
      expect((await prisma.expense.findUnique({ where: { id: `${P}expense-theirs` } }))?.isActive).toBe(true)
      expect((await prisma.gigMusician.findUnique({ where: { id: `${P}gm-theirs` } }))?.isActive).toBe(true)
      const item = await prisma.setlistItem.findUnique({ where: { id: `${P}item-theirs` } })
      expect(item?.isActive).toBe(true)
      expect(item?.wasPlayed).toBe(true)
    })

    it('addExpense and bulkAddMusicians refuse to attach to the other band', async () => {
      const { NotFoundError } = ownership
      await expect(
        gigActions.addExpense(form({ gigId: `${P}gig-theirs`, description: 'Sneaky', amount: '5' }))
      ).rejects.toBeInstanceOf(NotFoundError)
      expect(await prisma.expense.count({ where: { description: 'Sneaky' } })).toBe(0)

      const fd = form({ gigId: `${P}gig-ours` })
      fd.append('musicianIds', `${P}musician-theirs`)
      await expect(gigActions.bulkAddMusicians(fd)).rejects.toBeInstanceOf(NotFoundError)
      expect(await prisma.gigMusician.count({ where: { gigId: `${P}gig-ours`, musicianId: `${P}musician-theirs` } })).toBe(0)
    })

    it('updateGig, updateVenue, updateMusician and renameSetlist return "not found" and change nothing', async () => {
      expect(
        await gigActions.updateGig(null, form({ id: `${P}gig-theirs`, venueId: `${P}venue-ours`, date: '2030-01-01', notes: 'hijacked' }))
      ).toEqual({ error: 'Gig not found.' })
      expect(await venueActions.updateVenue(null, form({ id: `${P}venue-theirs`, name: 'Hijacked', address: '', notes: '' }))).toEqual({
        error: 'Venue not found.',
      })
      expect(await musicianActions.updateMusician(null, form({ id: `${P}musician-theirs`, name: 'Hijacked' }))).toEqual({
        error: 'Musician not found.',
      })
      expect(await setlistActions.renameSetlist(null, form({ id: `${P}setlist-theirs`, name: 'Hijacked' }))).toEqual({
        error: 'Setlist not found.',
      })

      expect((await prisma.gig.findUnique({ where: { id: `${P}gig-theirs` } }))?.notes).toBeNull()
      expect((await prisma.venue.findUnique({ where: { id: `${P}venue-theirs` } }))?.name).toBe('Venue theirs')
      expect((await prisma.musician.findUnique({ where: { id: `${P}musician-theirs` } }))?.name).toBe('Isolation Musician theirs')
      expect((await prisma.setlist.findUnique({ where: { id: `${P}setlist-theirs` } }))?.name).toBe('Setlist theirs')
    })

    it("createGig refuses the other band's venue and creates nothing", async () => {
      const before = await prisma.gig.count({ where: { bandId: ourBand } })
      const result = await gigActions.createGig(
        null,
        form({ venueId: `${P}venue-theirs`, date: '2030-01-01', createSetlist: 'true' })
      )
      expect(result).toEqual({ error: 'Venue not found.' })
      expect(await prisma.gig.count({ where: { bandId: ourBand } })).toBe(before)
    })

    it('copySetlistToGig will not read the other band\'s setlist', async () => {
      const result = await gigActions.copySetlistToGig(`${P}gig-ours`, `${P}setlist-theirs`)
      expect(result).toEqual({ error: 'Source setlist not found.' })
    })

    it('rows we create are stamped with our band', async () => {
      await expect(
        venueActions.createVenue(null, form({ name: 'Iso Created Venue', address: '', notes: '' }))
      ).rejects.toThrow('REDIRECT:/venues')
      const created = await prisma.venue.findFirst({ where: { name: 'Iso Created Venue' } })
      expect(created?.bandId).toBe(ourBand)
      await prisma.venue.delete({ where: { id: created!.id } })
    })
  })
})
