'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LyricsEditor } from '@/components/songs/lyrics-editor'
import { GenreCheckboxList } from '@/components/songs/genre-checkbox-list'
import { cn } from '@/lib/utils'
import type { SongActionState } from '@/app/songs/actions'
import { SONG_STATUS_LABELS, type Genre, type Song, type SongStatus } from '@/lib/types'

const STATUS_OPTIONS: SongStatus[] = ['WISH', 'IN_PROGRESS', 'READY', 'SHELVED']

type FormAction = (state: SongActionState, formData: FormData) => Promise<SongActionState>

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SongForm({
  song,
  genres,
  action,
}: {
  song?: Song
  genres: Genre[]
  action: FormAction
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const [keyboardRequired, setKeyboardRequired] = useState(song?.keyboardRequired ?? false)

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-5">
      {song && <input type="hidden" name="id" value={song.id} />}
      <input type="hidden" name="keyboardRequired" value={keyboardRequired ? 'true' : 'false'} />

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {/* Row 1: Title + Artist */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" required defaultValue={song?.title} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="artist">Original Artist</Label>
          <Input id="artist" name="artist" defaultValue={song?.artist ?? ''} />
        </div>
      </div>

      {/* Row 2: Key + Singer */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="key">Key</Label>
          <Input id="key" name="key" placeholder="e.g. Am, C, Bb" defaultValue={song?.key ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="singer">Singer</Label>
          <Input id="singer" name="singer" defaultValue={song?.singer ?? ''} />
        </div>
      </div>

      {/* Row 3: Status */}
      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={song?.status ?? 'WISH'}>
          <SelectTrigger id="status" className="w-full sm:max-w-xs">
            <SelectValue>
              {(value: SongStatus | null) => (value ? SONG_STATUS_LABELS[value] : null)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {SONG_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Genres */}
      <div className="space-y-1.5">
        <Label>Genres</Label>
        <GenreCheckboxList genres={genres} defaultCheckedIds={new Set(song?.genres.map((g) => g.id) ?? [])} />
      </div>

      {/* Row 4: Duration + BPM */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            name="duration"
            placeholder="e.g. 4:30"
            defaultValue={formatDuration(song?.durationSeconds ?? null)}
          />
          <p className="text-xs text-muted-foreground">Format: m:ss</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bpm">BPM</Label>
          <Input
            id="bpm"
            name="bpm"
            type="number"
            min="1"
            max="300"
            defaultValue={song?.bpm ?? ''}
          />
        </div>
      </div>

      {/* Keyboard required */}
      <div className="flex min-h-[44px] items-center gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={keyboardRequired ? 'true' : 'false'}
          onClick={() => setKeyboardRequired((v) => !v)}
          className={cn(
            'relative flex size-4 shrink-0 items-center justify-center rounded border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
            keyboardRequired
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-transparent'
          )}
        >
          {keyboardRequired && (
            <svg viewBox="0 0 12 12" className="size-3 fill-none stroke-current stroke-2">
              <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span
          className="cursor-pointer text-sm font-medium leading-none"
          onClick={() => setKeyboardRequired((v) => !v)}
        >
          Keyboard required
        </span>
      </div>

      {/* Lyrics / notes */}
      <div className="space-y-1.5">
        <Label htmlFor="lyrics-editor">Lyrics / Notes</Label>
        <LyricsEditor id="lyrics-editor" name="lyrics" defaultValue={song?.lyrics ?? ''} />
      </div>

      {/* Chart file */}
      <div className="space-y-1.5">
        <Label htmlFor="chartFile">Chart / Sheet Music (PDF, JPEG, or PNG)</Label>
        {song?.chartFileUrl && (
          <div className="flex min-h-[44px] items-center gap-3 text-sm">
            <a
              href={song.chartFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate underline"
            >
              {song.chartFileName ?? 'Current file'}
            </a>
            <label className="flex items-center gap-1.5 text-muted-foreground">
              <input type="checkbox" name="removeChartFile" value="true" />
              Remove
            </label>
          </div>
        )}
        <Input id="chartFile" name="chartFile" type="file" accept=".pdf,.jpg,.jpeg,.png" />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : song ? 'Save Changes' : 'Add Song'}
        </Button>
        <Link href="/songs" className={buttonVariants({ variant: 'outline' })}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
