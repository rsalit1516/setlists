import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Creating The Ruminators band...')

  const band = await prisma.band.upsert({
    where: { id: 'ruminators' },
    update: {},
    create: { id: 'ruminators', name: 'The Ruminators' },
  })

  console.log(`Band created: ${band.name} (${band.id})`)

  const [songs, setlists, venues, gigs] = await Promise.all([
    prisma.song.updateMany({ where: { bandId: null }, data: { bandId: band.id } }),
    prisma.setlist.updateMany({ where: { bandId: null }, data: { bandId: band.id } }),
    prisma.venue.updateMany({ where: { bandId: null }, data: { bandId: band.id } }),
    prisma.gig.updateMany({ where: { bandId: null }, data: { bandId: band.id } }),
  ])

  console.log(`Migrated: ${songs.count} songs, ${setlists.count} setlists, ${venues.count} venues, ${gigs.count} gigs`)
  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
