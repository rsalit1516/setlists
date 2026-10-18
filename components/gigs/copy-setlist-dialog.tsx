'use client'

import { useState, useTransition } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { copySetlistToGig } from '@/app/gigs/actions'
import { formatSetlistLabel } from '@/lib/setlist-label'
import { cn } from '@/lib/utils'
import type { SetlistSummary } from '@/lib/types'

export function CopySetlistDialog({
  gigId,
  sources,
  existingSongCount,
  triggerLabel = 'Copy Setlist',
  triggerClassName,
}: {
  gigId: string
  sources: SetlistSummary[]
  existingSongCount: number
  triggerLabel?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const replacing = existingSongCount > 0

  function handleOpenChange(next: boolean) {
    if (isPending) return
    setOpen(next)
    if (next) {
      setSelectedId(null)
      setError(null)
    }
  }

  function confirm() {
    if (!selectedId) return
    startTransition(async () => {
      const result = await copySetlistToGig(gigId, selectedId)
      if (result?.error) {
        setError(result.error)
        return
      }
      setOpen(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        className={cn(
          'inline-flex min-h-11 items-center text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          triggerClassName
        )}
      >
        {triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Copy a setlist</AlertDialogTitle>
          <AlertDialogDescription>
            {replacing
              ? `This will replace ${existingSongCount} song${existingSongCount !== 1 ? 's' : ''} currently on this setlist.`
              : 'Choose a setlist to copy onto this gig.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {sources.length === 0 ? (
          <p className="mb-4 text-sm italic text-muted-foreground">No other setlists with songs to copy.</p>
        ) : (
          <fieldset className="mb-4 flex max-h-64 flex-col gap-1 overflow-y-auto" disabled={isPending}>
            <legend className="sr-only">Source setlist</legend>
            {sources.map((sl) => (
              <label
                key={sl.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-muted has-[:checked]:bg-muted"
              >
                <input
                  type="radio"
                  name="sourceSetlistId"
                  value={sl.id}
                  checked={selectedId === sl.id}
                  onChange={() => setSelectedId(sl.id)}
                  className="size-4 shrink-0"
                />
                <span>{formatSetlistLabel(sl)}</span>
              </label>
            ))}
          </fieldset>
        )}

        {error && (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} className="h-11 sm:h-8">
            Cancel
          </AlertDialogCancel>
          <button
            type="button"
            onClick={confirm}
            disabled={!selectedId || isPending}
            className={cn(
              'inline-flex h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:h-8',
              replacing ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
            )}
          >
            {isPending ? 'Copying…' : replacing ? 'Replace setlist' : 'Copy'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
