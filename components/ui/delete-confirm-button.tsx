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
import { cn } from '@/lib/utils'

interface DeleteConfirmButtonProps {
  action: () => Promise<void>
  description?: string
  variant?: 'text' | 'icon'
  ariaLabel?: string
  className?: string
}

export function DeleteConfirmButton({
  action,
  description = 'This record will be deactivated and hidden from all views.',
  variant = 'text',
  ariaLabel,
  className,
}: DeleteConfirmButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      await action()
      setOpen(false)
    })
  }

  return (
    // Controlled so the dialog stays open (and locked) while the action runs —
    // otherwise a slow delete looks like a no-op and invites a second click.
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <AlertDialogTrigger
        aria-label={ariaLabel}
        className={cn(
          variant === 'icon'
            ? 'text-muted-foreground hover:text-destructive'
            : 'inline-flex h-7 items-center justify-center rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-destructive transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
      >
        {variant === 'icon' ? '×' : 'Delete'}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <button
            type="button"
            onClick={confirm}
            disabled={isPending}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-destructive px-3 text-sm font-medium text-white transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
