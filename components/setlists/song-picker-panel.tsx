'use client'

import { useState, useTransition } from 'react'
import { addItem } from '@/app/setlists/actions'
import { Button } from '@/components/ui/button'
import { toggleGenreId } from '@/lib/songs-genre-filter'
import { SONG_STATUS_LABELS, type Genre, type Song, type SetSection, type SongStatus } from '@/lib/types'

type TargetSection = { section: SetSection; setNumber: number; label: string }

type StatusFilter = SongStatus | 'ALL'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'READY', label: 'Ready' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WISH', label: 'Wish' },
]

function statusBadgeClass(status: SongStatus): string {
  switch (status) {
    case 'READY':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'IN_PROGRESS':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'WISH':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'SHELVED':
      // Unreachable in practice — shelved songs are filtered out of allSongs
      // before this component ever sees them (see lib/songs-selectable.ts).
      return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
  }
}

function buildSections(displaySets: number): TargetSection[] {
  return [
    { section: 'SOUNDCHECK', setNumber: 1, label: 'Soundcheck' },
    ...Array.from({ length: displaySets }, (_, i) => ({
      section: 'MAIN' as SetSection,
      setNumber: i + 1,
      label: `Set ${i + 1}`,
    })),
    { section: 'ENCORE', setNumber: 1, label: 'Encore' },
  ]
}

export function SongPickerPanel({
  allSongs,
  allGenres,
  setlistId,
  existingIds,
  displaySets,
}: {
  allSongs: Song[]
  allGenres: Genre[]
  setlistId: string
  existingIds: Set<string>
  displaySets: number
}) {
  const sections = buildSections(displaySets)
  const defaultTarget = sections.find((s) => s.section === 'MAIN') ?? sections[0]

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [genreFilter, setGenreFilter] = useState<string[]>([])
  const [target, setTarget] = useState<TargetSection>(defaultTarget)
  const [isPending, startTransition] = useTransition()

  const available = allSongs.filter(
    (s) =>
      !existingIds.has(s.id) &&
      (statusFilter === 'ALL' || s.status === statusFilter) &&
      (genreFilter.length === 0 || s.genres.some((g) => genreFilter.includes(g.id)))
  )

  function handleAdd(songId: string) {
    const fd = new FormData()
    fd.append('setlistId', setlistId)
    fd.append('songId', songId)
    fd.append('section', target.section)
    fd.append('setNumber', String(target.setNumber))
    startTransition(() => addItem(fd))
  }

  function handleTargetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const found = sections.find((s) => `${s.section}:${s.setNumber}` === e.target.value)
    if (found) setTarget(found)
  }

  return (
    <div className="flex max-h-[calc(100vh-5rem)] flex-col rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Song Library
        </span>
        <div className="flex items-center gap-1.5">
          <label htmlFor="picker-target" className="text-xs text-muted-foreground">
            Add to:
          </label>
          <select
            id="picker-target"
            value={`${target.section}:${target.setNumber}`}
            onChange={handleTargetChange}
            className="h-6 rounded border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring"
          >
            {sections.map((s) => (
              <option key={`${s.section}:${s.setNumber}`} value={`${s.section}:${s.setNumber}`}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 border-b px-3 py-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Genre filter — multiple can be active at once (OR-match), unlike Status above */}
      {allGenres.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b px-3 py-2">
          {allGenres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => setGenreFilter((selected) => toggleGenreId(selected, genre.id))}
              aria-pressed={genreFilter.includes(genre.id)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                genreFilter.includes(genre.id)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
      )}

      {/* Song list */}
      <div className="flex-1 overflow-y-auto">
        {available.length === 0 ? (
          <p className="px-4 py-3 text-sm italic text-muted-foreground">No songs available</p>
        ) : (
          <ul className="divide-y">
            {available.map((song) => (
              <li
                key={song.id}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{song.title}</p>
                  {song.artist && (
                    <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs ${statusBadgeClass(song.status)}`}
                >
                  {SONG_STATUS_LABELS[song.status]}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 px-2"
                  onClick={() => handleAdd(song.id)}
                  disabled={isPending}
                  aria-label={`Add ${song.title}`}
                >
                  +
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
