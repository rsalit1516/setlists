import { AddSongForm } from './add-song-form'
import { SortableSongList } from './sortable-song-list'
import { containerId } from './board-utils'
import { markSectionPlayed } from '@/app/setlists/actions'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SetlistItem, Song, SetSection } from '@/lib/types'

function totalDuration(items: SetlistItem[]) {
  const secs = items.reduce((acc, i) => acc + (i.song.durationSeconds ?? 0), 0)
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function SetlistSection({
  label,
  items,
  setlistId,
  section,
  setNumber,
  allSongs,
  revision,
}: {
  label: string
  items: SetlistItem[]
  setlistId: string
  section: SetSection
  setNumber: number
  allSongs: Song[]
  revision: boolean
}) {
  const existingIds = new Set(items.map((i) => i.songId))
  const total = totalDuration(items)

  return (
    <div className="rounded-lg border">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {total && (
            <span className="text-xs text-muted-foreground">{total}</span>
          )}
          {/* Bulk mark-as-played — numbered Sets and Encore only; Soundcheck
              stays one-by-one (stats ignore it, see sortable-song-list.tsx) */}
          {revision && section !== 'SOUNDCHECK' && (
            <form action={markSectionPlayed.bind(null, setlistId, { section, setNumber })}>
              <button
                type="submit"
                className={cn(buttonVariants({ variant: 'outline', size: 'xs' }), 'min-h-11 px-2.5')}
              >
                {section === 'ENCORE' ? 'Mark Encore as Played' : 'Mark Set as Played'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Song rows */}
      <SortableSongList items={items} revision={revision} containerId={containerId(section, setNumber)} />

      {/* Add song — hidden on tablet/desktop where the side panel is used */}
      <div className="px-4 pb-3 pt-2 md:hidden">
        <AddSongForm
          setlistId={setlistId}
          section={section}
          setNumber={setNumber}
          songs={allSongs}
          existingIds={existingIds}
        />
      </div>
    </div>
  )
}
