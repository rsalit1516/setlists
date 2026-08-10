import { cn } from '@/lib/utils'
import type { SongStatus } from '@/lib/types'

const styles: Record<SongStatus, string> = {
  READY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  WISH: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SHELVED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const labels: Record<SongStatus, string> = {
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  WISH: 'Wish',
  SHELVED: 'Shelved',
}

export function SongStatusBadge({ status }: { status: SongStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  )
}
