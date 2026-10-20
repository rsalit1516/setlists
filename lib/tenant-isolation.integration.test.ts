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

// The song form always submits every field, and the actions read them all.
const SONG_FORM = {
  title: 'Test Song',
  artist: '',
  key: '',
  singer: '',
  status: 'WISH',
  keyboardRequired: 'false',
  duration: '',
  bpm: '',
  lyrics: '',
}

const songForm = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries({ ...SONG_FORM, ...fields })) fd.set(k, v)
  return fd
}

// BandSong ids are uuids. Each band has one private song of its own plus the shared master song.
const BS = {
  oursOwn: '01900000-0000-7000-8000-0000000e1001',
  oursShared: '01900000-0000-7000-8000-0000000e1002',
  theirsOwn: '01900000-0000-7000-8000-0000000e2001',
  theirsShared: '01900000-0000-7000-8000-0000000e2002',
}

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
    songs: typeof import('@/lib/services/songs')
  }
  let songActions: typeof import('@/app/songs/actions')
  let gigActions: typeof import('@/app/gigs/actions')
  let setlistActions: typeof import('@/app/setlists/actions')
  let venueActions: typeof import('@/app/venues/actions')
  let musicianActions: typeof import('@/app/musicians/actions')
  let ownership: typeof import('@/lib/ownership')

  async function seedBand(bandId: string, tag: 'ours' | 'theirs', withPlay: boolean) {
    const own = tag === 'ours' ? BS.oursOwn : BS.theirsOwn
    const shared = tag === 'ours' ? BS.oursShared : BS.theirsShared
    await prisma.bandSong.create({
      data: { id: own, bandId, songId: `${P}song-${tag}`, status: 'READY', singer: `${tag} own singer` },
    })
    await prisma.bandSong.create({
      data: {
        id: shared,
        bandId,
        songId: `${P}song-shared`,
        status: tag === 'ours' ? 'READY' : 'WISH',
        singer: `${tag} singer`,
      },
    })
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
        bandSongId: own,
        setlistId: `${P}setlist-${tag}`,
      },
    })
  }

  async function cleanup() {
    await prisma.setlistItem.deleteMany({
      where: { OR: [{ id: { startsWith: P } }, { setlistId: { startsWith: P } }] },
    })
    await prisma.gigMusician.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.expense.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.gig.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.setlist.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.musician.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.venue.deleteMany({ where: { id: { startsWith: P } } })
    await prisma.bandSong.deleteMany({ where: { songId: { startsWith: P } } })
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
      songs: await import('@/lib/services/songs'),
    }
    songActions = await import('@/app/songs/actions')
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
    await prisma.song.create({ data: { id: `${P}song-ours`, title: 'Ours Only Song', ownerBandId: ourBand } })
    await prisma.song.create({ data: { id: `${P}song-theirs`, title: 'Theirs Only Song', ownerBandId: OTHER_BAND } })
    await prisma.song.create({ data: { id: `${P}song-shared`, title: 'Shared Master Song' } })
    // A master song neither band has added yet.
    await prisma.song.create({ data: { id: `${P}song-unadded`, title: 'Unadded Master Song', artist: 'Iso Artist' } })
    await seedBand(ourBand, 'ours', true)
    await seedBand(OTHER_BAND, 'theirs', true)
    // Loading every service and action module cold takes a few seconds on top of the inserts.
  }, 60_000)

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
      expect(mostPlayed).toContain(BS.oursOwn)
      expect(mostPlayed).not.toContain(BS.theirsOwn)
    })
  })

  describe('the song catalog', () => {
    it("lists the band's own songs and the master songs it has added, never another band's private song", async () => {
      const songs = await services.songs.getSongs(ourBand)
      const ids = songs.map((s) => s.id)
      expect(ids).toEqual(expect.arrayContaining([BS.oursOwn, BS.oursShared]))
      expect(ids).not.toContain(BS.theirsOwn)
      expect(ids).not.toContain(BS.theirsShared)
      expect(songs.map((s) => s.title)).not.toContain('Theirs Only Song')
    })

    it("shows a master song with each band's own status and singer", async () => {
      const ours = (await services.songs.getSongs(ourBand)).find((s) => s.id === BS.oursShared)
      expect(ours).toMatchObject({ title: 'Shared Master Song', status: 'READY', singer: 'ours singer' })

      const theirs = (await services.songs.getSongs(OTHER_BAND)).find((s) => s.id === BS.theirsShared)
      expect(theirs).toMatchObject({ title: 'Shared Master Song', status: 'WISH', singer: 'theirs singer' })
    })

    it("filters by the band's own status, not another band's", async () => {
      const ready = (await services.songs.getSongs(ourBand, 'READY')).map((s) => s.id)
      expect(ready).toContain(BS.oursShared)
      const wishOurs = (await services.songs.getSongs(ourBand, 'WISH')).map((s) => s.id)
      expect(wishOurs).not.toContain(BS.oursShared)
      expect(wishOurs).not.toContain(BS.theirsShared)
    })

    it("getSong by id returns null for another band's entry", async () => {
      expect(await services.songs.getSong(ourBand, BS.theirsOwn)).toBeNull()
      expect(await services.songs.getSong(ourBand, BS.theirsShared)).toBeNull()
      expect(await services.songs.getSong(ourBand, BS.oursOwn)).not.toBeNull()
    })

    it("addItem refuses a song from another band's catalog, but accepts one from ours", async () => {
      const form = (bandSongId: string) => {
        const fd = new FormData()
        fd.set('setlistId', `${P}setlist-ours`)
        fd.set('songId', bandSongId)
        fd.set('section', 'MAIN')
        fd.set('setNumber', '1')
        return fd
      }
      await expect(setlistActions.addItem(form(BS.theirsOwn))).rejects.toBeInstanceOf(ownership.NotFoundError)
      await expect(setlistActions.addItem(form(BS.theirsShared))).rejects.toBeInstanceOf(ownership.NotFoundError)

      await setlistActions.addItem(form(BS.oursShared))
      const added = await prisma.setlistItem.findMany({
        where: { setlistId: `${P}setlist-ours`, bandSongId: BS.oursShared },
      })
      expect(added).toHaveLength(1)
      expect(added[0].songId).toBe(`${P}song-shared`)
    })

    it("deleteSong, updateSong and findLyrics cannot touch another band's entry", async () => {
      await expect(songActions.deleteSong(BS.theirsOwn)).rejects.toBeInstanceOf(ownership.NotFoundError)
      await expect(songActions.findLyrics(BS.theirsOwn)).rejects.toBeInstanceOf(ownership.NotFoundError)
      const fd = new FormData()
      for (const [k, v] of Object.entries({ ...SONG_FORM, id: BS.theirsOwn, title: 'Hijacked', singer: 'x', status: 'READY' })) fd.set(k, v)
      expect(await songActions.updateSong(null, fd)).toEqual({ error: 'Song not found.' })

      const theirs = await prisma.bandSong.findUnique({ where: { id: BS.theirsOwn }, include: { song: true } })
      expect(theirs?.isActive).toBe(true)
      expect(theirs?.singer).toBe('theirs own singer')
      expect(theirs?.song.title).toBe('Theirs Only Song')
    })

    it("removing a master song from our catalog leaves the song and the other band's entry alone", async () => {
      await songActions.deleteSong(BS.oursShared)
      try {
        expect((await services.songs.getSongs(ourBand)).map((s) => s.id)).not.toContain(BS.oursShared)
        expect((await services.songs.getSongs(OTHER_BAND)).map((s) => s.id)).toContain(BS.theirsShared)
        expect((await prisma.song.findUnique({ where: { id: `${P}song-shared` } }))?.isActive).toBe(true)
      } finally {
        await prisma.bandSong.update({ where: { id: BS.oursShared }, data: { isActive: true } })
      }
    })

    it('a song we create is private to us and lands in our catalog only', async () => {
      const fd = new FormData()
      for (const [k, v] of Object.entries({ ...SONG_FORM, title: 'Iso Created Song', singer: 'Dana', status: 'READY', keyboardRequired: 'false' })) {
        fd.set(k, v)
      }
      await expect(songActions.createSong(null, fd)).rejects.toThrow('REDIRECT:/songs')

      const created = await prisma.song.findFirst({ where: { title: 'Iso Created Song' }, include: { bandSongs: true } })
      try {
        expect(created?.ownerBandId).toBe(ourBand)
        expect(created?.bandSongs).toHaveLength(1)
        expect(created?.bandSongs[0]).toMatchObject({ bandId: ourBand, singer: 'Dana', status: 'READY' })
        expect((await services.songs.getSongs(OTHER_BAND)).map((s) => s.title)).not.toContain('Iso Created Song')
      } finally {
        await prisma.bandSong.deleteMany({ where: { songId: created?.id } })
        await prisma.song.delete({ where: { id: created!.id } })
      }
    })
  })

  describe('searching and adding songs', () => {
    it("search finds master songs and our own private songs, and never another band's private song", async () => {
      const ids = async (bandId: string, title: string) =>
        (await services.songs.searchCatalog(bandId, { title })).map((m) => m.songId)

      expect(await ids(ourBand, 'Ours Only Song')).toContain(`${P}song-ours`)
      expect(await ids(ourBand, 'Theirs Only Song')).not.toContain(`${P}song-theirs`)
      expect(await ids(OTHER_BAND, 'Ours Only Song')).not.toContain(`${P}song-ours`)
      expect(await ids(OTHER_BAND, 'Theirs Only Song')).toContain(`${P}song-theirs`)
      expect(await ids(ourBand, 'Unadded Master Song')).toContain(`${P}song-unadded`)
      expect(await ids(OTHER_BAND, 'Unadded Master Song')).toContain(`${P}song-unadded`)
    })

    it('search reports, per band, whether a song is already in that band\'s songs', async () => {
      const shared = (bandId: string) =>
        services.songs.searchCatalog(bandId, { title: 'Shared Master Song' }).then((r) => r.find((m) => m.songId === `${P}song-shared`))

      expect(await shared(ourBand)).toMatchObject({ isMaster: true, bandSongId: BS.oursShared })
      expect(await shared(OTHER_BAND)).toMatchObject({ isMaster: true, bandSongId: BS.theirsShared })

      const unadded = (await services.songs.searchCatalog(ourBand, { title: 'Unadded Master Song' })).find(
        (m) => m.songId === `${P}song-unadded`
      )
      expect(unadded).toMatchObject({ isMaster: true, bandSongId: null, removed: false })
    })

    it("a band cannot add another band's private song to its catalog", async () => {
      await expect(songActions.addSongToCatalog(`${P}song-theirs`)).rejects.toBeInstanceOf(ownership.NotFoundError)
      expect(await prisma.bandSong.count({ where: { bandId: ourBand, songId: `${P}song-theirs` } })).toBe(0)
    })

    it('adding a master song creates only our entry; removing and re-adding keeps our status', async () => {
      await expect(songActions.addSongToCatalog(`${P}song-unadded`)).rejects.toThrow(/REDIRECT:\/songs\/.+\/edit/)

      const ours = await prisma.bandSong.findUnique({
        where: { bandId_songId: { bandId: ourBand, songId: `${P}song-unadded` } },
      })
      expect(ours).toMatchObject({ isActive: true, status: 'WISH' })
      expect(await prisma.bandSong.count({ where: { bandId: OTHER_BAND, songId: `${P}song-unadded` } })).toBe(0)

      await prisma.bandSong.update({ where: { id: ours!.id }, data: { status: 'READY' } })
      await songActions.deleteSong(ours!.id)
      const removed = (await services.songs.searchCatalog(ourBand, { title: 'Unadded Master Song' })).find(
        (m) => m.songId === `${P}song-unadded`
      )
      expect(removed).toMatchObject({ removed: true, bandSongId: null })

      await expect(songActions.addSongToCatalog(`${P}song-unadded`)).rejects.toThrow(/REDIRECT/)
      const back = await prisma.bandSong.findUnique({ where: { id: ours!.id } })
      expect(back).toMatchObject({ isActive: true, status: 'READY' })
    })

    it('creating a song that already exists in the shared catalog is refused', async () => {
      const result = await songActions.createSong(null, songForm({ title: 'shared master song' }))
      expect(result).toEqual({ error: expect.stringContaining('already in your songs') })
      expect(await prisma.song.count({ where: { title: 'shared master song' } })).toBe(0)
    })

    it("the duplicate check cannot see, or reveal, another band's private song", async () => {
      await expect(songActions.createSong(null, songForm({ title: 'Theirs Only Song' }))).rejects.toThrow('REDIRECT:/songs')

      const created = await prisma.song.findFirst({ where: { title: 'Theirs Only Song', ownerBandId: ourBand } })
      try {
        expect(created).not.toBeNull()
      } finally {
        if (created) {
          await prisma.bandSong.deleteMany({ where: { songId: created.id } })
          await prisma.song.delete({ where: { id: created.id } })
        }
      }
    })
  })

  describe('ownership helpers', () => {
    it("treat the other band's rows as not owned", async () => {
      expect(await ownership.isOwned('gig', ourBand, `${P}gig-ours`)).toBe(true)
      expect(await ownership.isOwned('gig', ourBand, `${P}gig-theirs`)).toBe(false)
      expect(await ownership.isOwned('bandSong', ourBand, BS.oursOwn)).toBe(true)
      expect(await ownership.isOwned('bandSong', ourBand, BS.theirsOwn)).toBe(false)
      expect(await ownership.isOwned('bandSong', ourBand, BS.theirsShared)).toBe(false)
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
