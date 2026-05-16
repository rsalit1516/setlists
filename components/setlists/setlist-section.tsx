import { moveItem, removeItem, togglePlayed } from '@/app/setlists/actions'
import { AddSongForm } from './add-song-form'
import { Button } from '@/components/ui/button'
import type { SetlistItem, Song, SetSection } from '@/lib/types'

function formatDuration(s: number | null) {
  if (!s) return null
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function totalDuration(items: SetlistItem[]) {
  const secs = items.reduce((acc, i) => acc + (i.song.durationSeconds ?? 0), 0)
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function playedClass(wasPlayed: boolean | null) {
  if (wasPlayed === true) return 'text-green-600 dark:text-green-400'
  if (wasPlayed === false) return 'text-red-500 line-through opacity-60 dark:text-red-400'
  return ''
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
      {items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground italic">No songs yet</p>
      ) : (
        <ul className="divide-y">
          {items.map((item, idx) => {
            const moveUpAction = moveItem.bind(null, item.id, 'up')
            const moveDownAction = moveItem.bind(null, item.id, 'down')
            const removeAction = removeItem.bind(null, item.id)
            const toggleAction = togglePlayed.bind(null, item.id, item.wasPlayed)

            return (
              <li
                key={item.id}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm ${playedClass(item.wasPlayed)}`}
              >
                {/* Reorder buttons */}
                <div className="flex flex-col">
                  <form action={moveUpAction}>
                    <button
                      type="submit"
                      disabled={idx === 0}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                      aria-label="Move up"
                    >
                      ▲
                    </button>
                  </form>
                  <form action={moveDownAction}>
                    <button
                      type="submit"
                      disabled={idx === items.length - 1}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                  </form>
                </div>

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{item.song.title}</span>
                  {item.song.key && (
                    <span className="ml-2 text-xs text-muted-foreground">{item.song.key}</span>
                  )}
                  {item.isUnplanned && (
                    <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      unplanned
                    </span>
                  )}
                </div>

                {/* Duration */}
                {item.song.durationSeconds && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDuration(item.song.durationSeconds)}
                  </span>
                )}

                {/* Revision mode: played toggle */}
                {revision && (
                  <form action={toggleAction}>
                    <button
                      type="submit"
                      className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                        item.wasPlayed === true
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : item.wasPlayed === false
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.wasPlayed === true ? '✓ Played' : item.wasPlayed === false ? '✗ Skipped' : 'Mark'}
                    </button>
                  </form>
                )}

                {/* Remove */}
                <form action={removeAction}>
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove song"
                  >
                    ×
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      )}

      {/* Add song */}
      <div className="px-4 pb-3 pt-2">
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
