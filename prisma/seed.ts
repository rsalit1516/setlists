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

const musicians = [
  { id: 'seed-musician-drums', name: 'Dana Drummer' },
  { id: 'seed-musician-bass', name: 'Sam Bassman' },
  { id: 'seed-musician-keys', name: 'Kit Keys' },
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

  const venue = { id: 'seed-venue-1', name: 'The Test Tavern', address: '1 Fixture Lane', notes: 'Fake venue for the dev database' }
  await prisma.venue.upsert({ where: { id: venue.id }, update: venue, create: venue })

  await prisma.setlist.upsert({
    where: { id: 'seed-setlist-1' },
    update: {},
    create: { id: 'seed-setlist-1', name: 'Test Tavern Night' },
  })
  for (const [index, [songId, section, setNumber]] of setlistItems.entries()) {
    const item = { id: `seed-item-${index + 1}`, order: index, section, setNumber, songId, setlistId: 'seed-setlist-1' }
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

  console.log(`Seeded ${songs.length} songs, ${musicians.length} musicians, 1 venue, 1 gig on ${new URL(connectionString!).host}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
