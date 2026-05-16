'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { SongActionState } from '@/app/songs/actions'
import type { Song } from '@/lib/types'

type FormAction = (state: SongActionState, formData: FormData) => Promise<SongActionState>

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SongForm({
  song,
  action,
}: {
  song?: Song
  action: FormAction
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const [keyboardRequired, setKeyboardRequired] = useState(song?.keyboardRequired ?? false)

  return (
    <form action={formAction} className="space-y-5">
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

      {/* Row 3: Status + Orientation */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            title="Status"
            defaultValue={song?.status ?? 'WISH'}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="WISH">Wish</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="READY">Ready</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="orientation">Orientation / Genre</Label>
          <Input
            id="orientation"
            name="orientation"
            placeholder="e.g. Dead, Funk, Mainstream"
            defaultValue={song?.orientation ?? ''}
          />
        </div>
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

      {/* Row 5: URLs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lyricsUrl">Lyrics URL</Label>
          <Input id="lyricsUrl" name="lyricsUrl" type="url" defaultValue={song?.lyricsUrl ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="chartsUrl">Charts URL</Label>
          <Input id="chartsUrl" name="chartsUrl" type="url" defaultValue={song?.chartsUrl ?? ''} />
        </div>
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
