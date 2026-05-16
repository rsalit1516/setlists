import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSetlist } from '@/lib/services/setlists'
import { getSongs } from '@/lib/services/songs'
import { SetlistSection } from '@/components/setlists/setlist-section'
import { RenameForm } from '@/components/setlists/rename-form'
import { buttonVariants } from '@/components/ui/button'
import type { SetlistItem } from '@/lib/types'

function groupBySection(items: SetlistItem[]) {
  const soundcheck = items.filter((i) => i.section === 'SOUNDCHECK')
  const main = items.filter((i) => i.section === 'MAIN')
  const encore = items.filter((i) => i.section === 'ENCORE')
  const maxSet = main.reduce((m, i) => Math.max(m, i.setNumber), 0)
  return { soundcheck, main, encore, maxSet }
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default async function SetlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ revision?: string; sets?: string }>
}) {
  const { id } = await params
  const { revision: revParam, sets: setsParam } = await searchParams
  const revision = revParam === '1'

  const [setlist, allSongs] = await Promise.all([getSetlist(id), getSongs()])
  if (!setlist) notFound()

  const { soundcheck, main, encore, maxSet } = groupBySection(setlist.items)

  // How many set sections to display — at least 1, at least the occupied max, or param
  const displaySets = Math.max(maxSet, setsParam ? parseInt(setsParam) : 1, 1)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-2">
        <Link href="/setlists" className="text-sm text-muted-foreground hover:underline">
          ← Setlists
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <RenameForm id={setlist.id} currentName={setlist.name} />
          {setlist.gig && (
            <p className="mt-1 text-sm text-muted-foreground">
              {setlist.gig.venue.name} · {formatDate(setlist.gig.date)}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {setlist.gig ? (
            <Link
              href={`/gigs/${setlist.gig.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              View Gig
            </Link>
          ) : (
            <Link
              href={`/gigs/new?setlistId=${setlist.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Schedule Gig
            </Link>
          )}
          <Link
            href={revision ? `/setlists/${id}` : `/setlists/${id}?revision=1`}
            className={buttonVariants({ variant: revision ? 'default' : 'outline', size: 'sm' })}
          >
            {revision ? '✓ Revision Mode' : 'Revision Mode'}
          </Link>
        </div>
      </div>

      {revision && (
        <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          Revision mode — mark each song as played or skipped.
        </div>
      )}

      <div className="space-y-4">
        <SetlistSection
          label="Soundcheck"
          items={soundcheck}
          setlistId={setlist.id}
          section="SOUNDCHECK"
          setNumber={1}
          allSongs={allSongs}
          revision={revision}
        />

        {Array.from({ length: displaySets }, (_, idx) => {
          const setNum = idx + 1
          return (
            <SetlistSection
              key={setNum}
              label={`Set ${setNum}`}
              items={main.filter((i) => i.setNumber === setNum)}
              setlistId={setlist.id}
              section="MAIN"
              setNumber={setNum}
              allSongs={allSongs}
              revision={revision}
            />
          )
        })}

        {/* Add another set */}
        {!revision && (
          <div className="flex justify-center">
            <Link
              href={`/setlists/${id}?sets=${displaySets + 1}`}
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              + Add Set {displaySets + 1}
            </Link>
          </div>
        )}

        <SetlistSection
          label="Encore"
          items={encore}
          setlistId={setlist.id}
          section="ENCORE"
          setNumber={1}
          allSongs={allSongs}
          revision={revision}
        />
      </div>
    </div>
  )
}
