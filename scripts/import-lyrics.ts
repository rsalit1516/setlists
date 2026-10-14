// Dry run (default): npx tsx scripts/import-lyrics.ts [--limit=25]
// Write to the DB:   npx tsx scripts/import-lyrics.ts --apply [--limit=25]
import 'dotenv/config'
import { importMissingLyrics } from '@/lib/services/lyrics-import'

const apply = process.argv.includes('--apply')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined

async function main() {
  const summary = await importMissingLyrics({ dryRun: !apply, limit })

  for (const r of summary.results) {
    console.log(`${r.outcome.padEnd(9)} ${r.title}${r.artist ? ` — ${r.artist}` : ''}${r.error ? `  [${r.error}]` : ''}`)
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
