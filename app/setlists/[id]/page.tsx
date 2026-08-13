import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSetlist } from '@/lib/services/setlists'
import { getSongs } from '@/lib/services/songs'
import { getGenres } from '@/lib/services/genres'
import { selectableSongs } from '@/lib/songs-selectable'
import { SetlistBoard } from '@/components/setlists/setlist-board'
import { RenameForm } from '@/components/setlists/rename-form'
import { SongPickerPanel } from '@/components/setlists/song-picker-panel'
import { markSectionPlayed } from '@/app/setlists/actions'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SetlistItem } from '@/lib/types'

function maxSetNumber(items: SetlistItem[]) {
  return items.reduce((m, i) => (i.section === 'MAIN' ? Math.max(m, i.setNumber) : m), 0)
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

  const [setlist, songs, allGenres] = await Promise.all([
    getSetlist(id),
    getSongs(undefined, undefined, true),
    getGenres(),
  ])
  if (!setlist) notFound()

  // Shelved songs can't be added to a setlist — see lib/songs-selectable.ts.
  const allSongs = selectableSongs(songs)

  const allExistingIds = new Set(setlist.items.map((i) => i.songId))

  // How many set sections to display — at least 1, at least the occupied max, or param
  const displaySets = Math.max(maxSetNumber(setlist.items), setsParam ? parseInt(setsParam) : 1, 1)

  return (
    <div className="mx-auto px-4 py-6 md:flex md:max-w-5xl md:gap-6">
      {/* Main setlist content */}
      <div className="min-w-0 flex-1">
        <div className="mb-2">
          <Link
            href={setlist.gig ? `/gigs/${setlist.gig.id}` : '/gigs'}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to Gig
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <RenameForm id={setlist.id} currentName={setlist.name} />
            {setlist.gig && (
              <p className="mt-1 text-sm text-muted-foreground">
                <Link href={`/gigs/${setlist.gig.id}`} className="hover:underline">
                  {setlist.gig.venue.name} · {formatDate(setlist.gig.date)}
                </Link>
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              href={`/gigs/new?setlistId=${setlist.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Use for New Gig
            </Link>
            <Link
              href={revision ? `/setlists/${id}` : `/setlists/${id}?revision=1`}
              className={buttonVariants({ variant: revision ? 'default' : 'outline', size: 'sm' })}
            >
              {revision ? '✓ Revision Mode' : 'Revision Mode'}
            </Link>
          </div>
        </div>

        {revision && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <span>Revision mode — mark each song as played or skipped.</span>
            <form action={markSectionPlayed.bind(null, setlist.id, 'all')}>
              <button
                type="submit"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'min-h-11 border-amber-300 bg-amber-100 px-3 text-amber-900 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60'
                )}
              >
                Mark All as Played
              </button>
            </form>
          </div>
        )}

        <SetlistBoard
          setlistId={setlist.id}
          items={setlist.items}
          displaySets={displaySets}
          allSongs={allSongs}
          revision={revision}
        />
      </div>

      {/* Song picker — tablet/desktop only, hidden in revision mode */}
      {!revision && (
        <aside className="hidden md:sticky md:top-6 md:flex md:w-72 md:shrink-0 md:self-start md:flex-col lg:w-80">
          <SongPickerPanel
            allSongs={allSongs}
            allGenres={allGenres}
            setlistId={setlist.id}
            existingIds={allExistingIds}
            displaySets={displaySets}
          />
        </aside>
      )}
    </div>
  )
}
