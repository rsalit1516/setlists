// Fake data for the dev database only. Run via `ALLOW_SEED=true npx prisma migrate reset`
// (wipes, re-migrates, then seeds) or `ALLOW_SEED=true npx prisma db seed` (adds to what's there).
// Every row uses a fixed `seed-` id and is upserted, so re-running never duplicates anything.
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')
if (process.env.ALLOW_SEED !== 'true') {
  throw new Error(
    `Refusing to seed ${new URL(connectionString).host}: set ALLOW_SEED=true to confirm this is NOT production.`
  )
}

const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) })

const genres = [
  { id: 'seed-genre-rock', name: 'Rock' },
  { id: 'seed-genre-blues', name: 'Blues' },
  { id: 'seed-genre-funk', name: 'Funk' },
]

// The first band is the one the add_band_tenancy migration creates; the second exists only so
// tenant-isolation bugs show up on the dev site.
const bandId = '01900000-0000-7000-8000-000000000001'
const otherBandId = '01900000-0000-7000-8000-0000000000a2'

// Logins for when sign-in lands (#140): one admin per band, plus a user in both bands to
// exercise the band switcher.
const users = [
  { id: '01900000-0000-7000-8000-0000000000b1', email: 'ruminators.admin@example.com', name: 'Ruminators Admin' },
  { id: '01900000-0000-7000-8000-0000000000b2', email: 'pilots.admin@example.com', name: 'Test Pilots Admin' },
  { id: '01900000-0000-7000-8000-0000000000b3', email: 'both.bands@example.com', name: 'Casey Both' },
]
const memberships = [
  { id: '01900000-0000-7000-8000-0000000000c1', userId: users[0].id, bandId, role: 'ADMIN' as const },
  { id: '01900000-0000-7000-8000-0000000000c2', userId: users[1].id, bandId: otherBandId, role: 'ADMIN' as const },
  { id: '01900000-0000-7000-8000-0000000000c3', userId: users[2].id, bandId, role: 'MEMBER' as const },
  { id: '01900000-0000-7000-8000-0000000000c4', userId: users[2].id, bandId: otherBandId, role: 'MEMBER' as const },
]

const musicians = [
  { id: 'seed-musician-drums', name: 'Dana Drummer', bandId },
  { id: 'seed-musician-bass', name: 'Sam Bassman', bandId },
  { id: 'seed-musician-keys', name: 'Kit Keys', bandId },
]

const lyrics = (...lines: string[]) => lines.map((l) => `<p>${l}</p>`).join('')

type SeedSong = {
  id: string
  title: string
  artist: string
  key: string | null
  singer: string | null
  status: 'READY' | 'IN_PROGRESS' | 'WISH' | 'SHELVED'
  bpm: number | null
  durationSeconds: number
  keyboardRequired?: boolean
  lyrics?: string
  genre: string
}

const songs: SeedSong[] = [
  { id: 'seed-song-01', title: 'Midnight Train Test', artist: 'The Fixtures', key: 'G', singer: 'Dana Drummer', status: 'READY', bpm: 108, durationSeconds: 245, genre: 'seed-genre-rock', lyrics: lyrics('Rolling down the line tonight', 'Test data shining bright', 'Hold the beat, hold it tight', 'Midnight train, midnight train') },
  { id: 'seed-song-02', title: 'Slow Burn Blues', artist: 'The Fixtures', key: 'Am', singer: 'Sam Bassman', status: 'READY', bpm: 68, durationSeconds: 330, genre: 'seed-genre-blues', lyrics: lyrics('I woke up this morning', 'Nothing left to mock') },
  { id: 'seed-song-03', title: 'Funky Placeholder', artist: 'Lorem Ipsum', key: 'E', singer: 'Dana Drummer', status: 'READY', bpm: 112, durationSeconds: 290, genre: 'seed-genre-funk', keyboardRequired: true, lyrics: lyrics('Placeholder, placeholder', 'Get on down') },
  { id: 'seed-song-04', title: 'No Tempo Listed', artist: 'Lorem Ipsum', key: 'D', singer: null, status: 'READY', bpm: null, durationSeconds: 200, genre: 'seed-genre-rock' },
  { id: 'seed-song-05', title: 'Fast and Furious Fixture', artist: 'The Fixtures', key: 'A', singer: 'Dana Drummer', status: 'READY', bpm: 176, durationSeconds: 180, genre: 'seed-genre-rock', lyrics: lyrics('Faster, faster, faster still') },
  { id: 'seed-song-06', title: 'Ballad of the Seed Script', artist: 'Anonymous', key: 'C', singer: 'Kit Keys', status: 'READY', bpm: 54, durationSeconds: 360, genre: 'seed-genre-blues', keyboardRequired: true, lyrics: lyrics('Wipe it clean and start again') },
  { id: 'seed-song-07', title: 'Shuffle in B', artist: 'Lorem Ipsum', key: 'B', singer: 'Sam Bassman', status: 'READY', bpm: 124, durationSeconds: 255, genre: 'seed-genre-blues' },
  { id: 'seed-song-08', title: 'Groove Under Construction', artist: 'The Fixtures', key: 'F#m', singer: null, status: 'IN_PROGRESS', bpm: 98, durationSeconds: 270, genre: 'seed-genre-funk' },
  { id: 'seed-song-09', title: 'Someday We Will Learn This', artist: 'Anonymous', key: 'Bb', singer: null, status: 'IN_PROGRESS', bpm: null, durationSeconds: 300, genre: 'seed-genre-rock' },
  { id: 'seed-song-10', title: 'Wishlist Waltz', artist: 'Anonymous', key: null, singer: null, status: 'WISH', bpm: 90, durationSeconds: 220, genre: 'seed-genre-rock' },
  { id: 'seed-song-11', title: 'Shelved Stomper', artist: 'The Fixtures', key: 'E', singer: null, status: 'SHELVED', bpm: 140, durationSeconds: 210, genre: 'seed-genre-rock' },
  { id: 'seed-song-12', title: 'Encore Singalong', artist: 'The Fixtures', key: 'G', singer: 'Dana Drummer', status: 'READY', bpm: 120, durationSeconds: 240, genre: 'seed-genre-rock', lyrics: lyrics('Everybody sing along', 'One more time, one more song') },
]

// [songId, section, setNumber]
const setlistItems: [string, 'SOUNDCHECK' | 'MAIN' | 'ENCORE', number][] = [
  ['seed-song-04', 'SOUNDCHECK', 1],
  ['seed-song-01', 'MAIN', 1],
  ['seed-song-03', 'MAIN', 1],
  ['seed-song-02', 'MAIN', 1],
  ['seed-song-05', 'MAIN', 1],
  ['seed-song-06', 'MAIN', 2],
  ['seed-song-07', 'MAIN', 2],
  ['seed-song-01', 'MAIN', 2],
  ['seed-song-12', 'ENCORE', 2],
]

async function main() {
  const bands = [
    { id: bandId, name: 'The Ruminators' },
    { id: otherBandId, name: 'The Test Pilots' },
  ]
  for (const b of bands) {
    await prisma.band.upsert({ where: { id: b.id }, update: b, create: b })
  }
  for (const u of users) {
    await prisma.user.upsert({ where: { id: u.id }, update: u, create: u })
  }
  for (const m of memberships) {
    await prisma.bandMember.upsert({ where: { id: m.id }, update: m, create: m })
  }

  for (const g of genres) {
    await prisma.genre.upsert({ where: { id: g.id }, update: g, create: g })
  }
  for (const m of musicians) {
    await prisma.musician.upsert({ where: { id: m.id }, update: m, create: m })
  }
  for (const { genre, ...song } of songs) {
    await prisma.song.upsert({
      where: { id: song.id },
      update: { ...song, genres: { set: [{ id: genre }] } },
      create: { ...song, genres: { connect: [{ id: genre }] } },
    })
  }

  // Upserted by (bandId, songId) because on an already-migrated dev database the migration created
  // these rows with random ids.
  const bandSongIds = new Map<string, string>()
  async function attachSong(
    forBandId: string,
    songId: string,
    fields: { status: SeedSong['status']; singer: string | null; keyboardRequired: boolean }
  ) {
    const row = await prisma.bandSong.upsert({
      where: { bandId_songId: { bandId: forBandId, songId } },
      update: fields,
      create: { bandId: forBandId, songId, ...fields },
    })
    bandSongIds.set(`${forBandId}|${songId}`, row.id)
  }
  // Every seed song is in the master catalog (ownerBandId null) and in The Ruminators' catalog.
  for (const s of songs) {
    await attachSong(bandId, s.id, { status: s.status, singer: s.singer, keyboardRequired: s.keyboardRequired ?? false })
  }
  // The Test Pilots share a few master songs under their own status, plus one song only they have.
  const pilotsSongs: [string, SeedSong['status'], string | null][] = [
    ['seed-song-01', 'READY', null],
    ['seed-song-02', 'IN_PROGRESS', 'Pat Pilot'],
    ['seed-song-05', 'WISH', null],
    ['seed-song-12', 'READY', 'Pat Pilot'],
  ]
  for (const [songId, status, singer] of pilotsSongs) {
    await attachSong(otherBandId, songId, { status, singer, keyboardRequired: false })
  }
  const privateSong = {
    id: 'seed-song-private-pilots',
    title: 'Pilots Original (private)',
    artist: 'The Test Pilots',
    key: 'D',
    bpm: 100,
    durationSeconds: 215,
    lyrics: lyrics('Only the Test Pilots can see this one'),
    ownerBandId: otherBandId,
  }
  await prisma.song.upsert({ where: { id: privateSong.id }, update: privateSong, create: privateSong })
  await attachSong(otherBandId, privateSong.id, { status: 'READY', singer: 'Pat Pilot', keyboardRequired: false })

  const venue = { id: 'seed-venue-1', name: 'The Test Tavern', address: '1 Fixture Lane', notes: 'Fake venue for the dev database', bandId }
  await prisma.venue.upsert({ where: { id: venue.id }, update: venue, create: venue })

  await prisma.setlist.upsert({
    where: { id: 'seed-setlist-1' },
    update: {},
    create: { id: 'seed-setlist-1', name: 'Test Tavern Night', bandId },
  })
  for (const [index, [songId, section, setNumber]] of setlistItems.entries()) {
    const item = {
      id: `seed-item-${index + 1}`,
      order: index,
      section,
      setNumber,
      songId,
      bandSongId: bandSongIds.get(`${bandId}|${songId}`),
      setlistId: 'seed-setlist-1',
    }
    await prisma.setlistItem.upsert({ where: { id: item.id }, update: item, create: item })
  }

  const gigDate = new Date()
  gigDate.setDate(gigDate.getDate() + 14)
  gigDate.setHours(12, 0, 0, 0)
  const gig = {
    id: 'seed-gig-1',
    date: gigDate,
    startTime: '19:00',
    endTime: '22:00',
    notes: 'Seeded gig — safe to edit or delete.',
    amountContracted: 800,
    tips: 60,
    bandId,
    venueId: venue.id,
    setlistId: 'seed-setlist-1',
    setlistCreatorId: 'seed-musician-keys',
  }
  await prisma.gig.upsert({ where: { id: gig.id }, update: gig, create: gig })

  await prisma.expense.upsert({
    where: { id: 'seed-expense-1' },
    update: {},
    create: { id: 'seed-expense-1', description: 'Parking', amount: 20, gigId: gig.id },
  })
  for (const [index, m] of musicians.entries()) {
    const gm = { id: `seed-gigmusician-${index + 1}`, gigId: gig.id, musicianId: m.id }
    await prisma.gigMusician.upsert({ where: { id: gm.id }, update: {}, create: gm })
  }

  const otherMusician = { id: 'seed-musician-other', name: 'Pat Pilot', bandId: otherBandId }
  await prisma.musician.upsert({ where: { id: otherMusician.id }, update: otherMusician, create: otherMusician })
  const otherVenue = { id: 'seed-venue-other', name: 'The Hangar', address: '2 Fixture Lane', notes: 'Belongs to the second band', bandId: otherBandId }
  await prisma.venue.upsert({ where: { id: otherVenue.id }, update: otherVenue, create: otherVenue })
  await prisma.setlist.upsert({
    where: { id: 'seed-setlist-other' },
    update: {},
    create: { id: 'seed-setlist-other', name: 'Hangar Night', bandId: otherBandId },
  })
  const otherGig = {
    id: 'seed-gig-other',
    date: new Date(gigDate.getTime() + 7 * 24 * 60 * 60 * 1000),
    startTime: '20:00',
    endTime: '23:00',
    notes: 'Second band — should never show for The Ruminators.',
    amountContracted: 500,
    bandId: otherBandId,
    venueId: otherVenue.id,
    setlistId: 'seed-setlist-other',
  }
  await prisma.gig.upsert({ where: { id: otherGig.id }, update: otherGig, create: otherGig })

  // A played, unpaid past gig and an expense that exist only for the second band, so the stats and
  // finance pages visibly differ between the two bands.
  await prisma.setlist.upsert({
    where: { id: 'seed-setlist-other-past' },
    update: {},
    create: { id: 'seed-setlist-other-past', name: 'Hangar Night (past)', bandId: otherBandId },
  })
  const pastItem = { id: 'seed-item-other-1', order: 0, section: 'MAIN' as const, setNumber: 1, wasPlayed: true, songId: 'seed-song-02', bandSongId: bandSongIds.get(`${otherBandId}|seed-song-02`), setlistId: 'seed-setlist-other-past' }
  await prisma.setlistItem.upsert({ where: { id: pastItem.id }, update: pastItem, create: pastItem })
  const pastDate = new Date(gigDate.getTime() - 44 * 24 * 60 * 60 * 1000)
  const otherPastGig = {
    id: 'seed-gig-other-past',
    date: pastDate,
    notes: 'Second band, past and unpaid.',
    amountContracted: 300,
    bandId: otherBandId,
    venueId: otherVenue.id,
    setlistId: 'seed-setlist-other-past',
  }
  await prisma.gig.upsert({ where: { id: otherPastGig.id }, update: otherPastGig, create: otherPastGig })
  await prisma.expense.upsert({
    where: { id: 'seed-expense-other-1' },
    update: {},
    create: { id: 'seed-expense-other-1', description: 'Van rental', amount: 75, gigId: otherPastGig.id },
  })
  await prisma.gigMusician.upsert({
    where: { id: 'seed-gigmusician-other-1' },
    update: {},
    create: { id: 'seed-gigmusician-other-1', gigId: otherPastGig.id, musicianId: otherMusician.id },
  })

  console.log(
    `Seeded ${songs.length + 1} songs, ${bands.length} bands, ${users.length} users, ${musicians.length + 1} musicians, 3 gigs on ${new URL(connectionString!).host}.`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
