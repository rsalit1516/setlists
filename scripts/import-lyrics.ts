// Dry run (default): npx tsx scripts/import-lyrics.ts [--limit=25] [--band=<band id>]
// Write to the DB:   npx tsx scripts/import-lyrics.ts --apply [--limit=25] [--band=<band id>]
// Only considers songs in that band's catalog (default: The Ruminators).
import 'dotenv/config'
import { importMissingLyrics } from '@/lib/services/lyrics-import'
import { DEFAULT_BAND_ID } from '@/lib/band'

const apply = process.argv.includes('--apply')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined
const bandArg = process.argv.find((a) => a.startsWith('--band='))
const bandId = bandArg ? bandArg.split('=')[1] : DEFAULT_BAND_ID

async function main() {
  // Runs as a platform admin, so master songs are included along with the band's own.
  const summary = await importMissingLyrics({ bandId, isPlatformAdmin: true, dryRun: !apply, limit })

  for (const r of summary.results) {
    console.log(`${r.outcome.padEnd(9)} ${r.title}${r.artist ? ` — ${r.artist}` : ''}`)
  }
  console.log(
    `\n${summary.dryRun ? 'DRY RUN — nothing written. ' : ''}` +
      `imported ${summary.imported}, no match ${summary.noMatch}, errors ${summary.errors}`
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
