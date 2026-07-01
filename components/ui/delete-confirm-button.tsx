'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface DeleteConfirmButtonProps {
  action: () => Promise<void>
  description?: string
  variant?: 'text' | 'icon'
  ariaLabel?: string
}

export function DeleteConfirmButton({
  action,
  description = 'This record will be deactivated and hidden from all views.',
  variant = 'text',
  ariaLabel,
}: DeleteConfirmButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        aria-label={ariaLabel}
        className={
          variant === 'icon'
            ? 'text-muted-foreground hover:text-destructive'
            : 'inline-flex h-7 items-center justify-center rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-destructive transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        }
      >
        {variant === 'icon' ? '×' : 'Delete'}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => action()}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
