import { AddSongForm } from './add-song-form'
import { SortableSongList } from './sortable-song-list'
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
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {total && (
          <span className="text-xs text-muted-foreground">{total}</span>
        )}
      </div>

      {/* Song rows */}
      <SortableSongList items={items} setlistId={setlistId} revision={revision} />

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
