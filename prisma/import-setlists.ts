// Run after import.ts: npx tsx prisma/import-setlists.ts
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
const adapter = new PrismaPg(process.env.DATABASE_URL)
const prisma = new PrismaClient({ adapter })

const VENUE_MAP: Record<string, string> = {
  'sharkeys': "Sharkey's",
  'sharkey': "Sharkey's",
  'galuppis': "Galuppi's",
  'galuppi': "Galuppi's",
  'luvn oven': "Luv'n Oven",
  'lovn oven': "Luv'n Oven",
  'tiki bar': 'Boca Tiki Bar',
  'tiki acoustic': 'Boca Tiki Bar',
  'tiki': 'Boca Tiki Bar',
  'robins ranch': "Robin's Ranch",
  'leftys': "Lefty's",
  'lefty': "Lefty's",
  'lauder ale': 'LauderAle',
  'bungalow': 'The Bungalow',
  'the walk': 'The Walk',
  'epstien': 'Epstein',
  'epstein': 'Epstein',
  'marina 84': 'Marina 84',
  'margaritaville': 'Margaritaville',
  'coconut creek': 'Coconut Creek',
  'pbb': 'PBB',
  'gigi': 'Gigi',
  'christa': 'Christa',
  'ellis': 'Ellis',
  'mgv': 'MGV',
  'flah': 'FLAH',
  'planet rv': 'Planet RV',
  'block': 'Block',
}

type SongEntry = { song: string; section: string; order: number; setNumber: number }
type SetlistData = { name: string; sections: Record<string, SongEntry[]> }

function parseTabName(name: string): { venuePrefix: string; date: Date } | null {
  // Matches: "Venue Name 05-16-26", "Block - 11-24-23", "Planet RV 04.12.24", "Lovn Oven 8-30-25"
  const m = name.match(/^(.*?)\s*(?:-\s*)?(\d{1,2})[-.\/](\d{2})[-.\/](\d{2})$/)
  if (!m) return null
  const venuePrefix = m[1].trim().replace(/-\s*$/, '').trim()
  const month = parseInt(m[2])
  const day = parseInt(m[3])
  const year = 2000 + parseInt(m[4])
  return { venuePrefix, date: new Date(Date.UTC(year, month - 1, day)) }
}

function resolveVenueName(prefix: string): string {
  return VENUE_MAP[prefix.toLowerCase()] ?? prefix
}

async function getOrCreateVenue(name: string): Promise<string> {
  const existing = await (prisma as any).venue.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) return existing.id
  const created = await (prisma as any).venue.create({ data: { name } })
  console.log(`  [new venue] ${name}`)
  return created.id
}

async function findSong(title: string): Promise<string | null> {
  const song = await (prisma as any).song.findFirst({
    where: { title: { equals: title, mode: 'insensitive' } },
  })
  return song?.id ?? null
}

async function main() {
  const jsonPath = path.join(__dirname, 'setlists_export.json')
  const setlists: SetlistData[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

  let imported = 0
  let skipped = 0

  for (const data of setlists) {
    // Skip if already imported
    const existing = await (prisma as any).setlist.findFirst({
      where: { name: data.name },
    })
    if (existing) {
      console.log(`skip (exists): ${data.name}`)
      skipped++
      continue
    }

    const parsed = parseTabName(data.name)
    if (!parsed) {
      console.warn(`skip (unparseable): "${data.name}"`)
      skipped++
      continue
    }

    const { venuePrefix, date } = parsed
    const venueName = resolveVenueName(venuePrefix)
    const venueId = await getOrCreateVenue(venueName)

    // Collect items; cap single-section flat sheets
    const sectionKeys = Object.keys(data.sections)
    const totalSongs = Object.values(data.sections).reduce((s, a) => s + a.length, 0)
    const isFlat = totalSongs > 35 && sectionKeys.length === 1

    const items: SongEntry[] = []
    for (const songs of Object.values(data.sections)) {
      const slice = isFlat ? songs.slice(0, 30) : songs
      items.push(...slice)
    }

    // Create setlist and linked gig
    const setlist = await (prisma as any).setlist.create({ data: { name: data.name } })
    await (prisma as any).gig.create({ data: { date, venueId, setlistId: setlist.id } })

    // Create setlist items
    let matched = 0
    let missed = 0
    for (const item of items) {
      const songId = await findSong(item.song)
      if (!songId) {
        console.warn(`  [no song] "${item.song}"`)
        missed++
        continue
      }
      await (prisma as any).setlistItem.create({
        data: {
          setlistId: setlist.id,
          songId,
          section: item.section,
          setNumber: item.setNumber,
          order: item.order,
        },
      })
      matched++
    }

    const cap = isFlat ? ` (capped from ${totalSongs})` : ''
    console.log(`✓ ${data.name}: ${matched} songs${missed ? `, ${missed} unmatched` : ''}${cap}`)
    imported++
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
