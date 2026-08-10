import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { SONGS_STATUS_COOKIE, type SongsStatusFilter } from '@/lib/songs-status-filter'
import { SONG_STATUS_LABELS, type SongStatus } from '@/lib/types'

const STATUSES = Object.keys(SONG_STATUS_LABELS) as SongStatus[]

const FILTERS: { value: SongsStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  ...STATUSES.map((status) => ({ value: status, label: SONG_STATUS_LABELS[status] })),
]

function redirectFor(value: SongsStatusFilter): string {
  return value === 'ALL' ? '/songs' : `/songs?status=${value}`
}

export function StatusFilter({ current }: { current: SongsStatusFilter }) {
  return (
    <nav aria-label="Song status filter" className="mb-6 flex flex-wrap gap-2 print:hidden">
      {FILTERS.map((f) => (
        <Link
          key={f.value}
          href={`/api/preferences?cookie=${SONGS_STATUS_COOKIE}&value=${f.value}&redirect=${encodeURIComponent(redirectFor(f.value))}`}
          aria-current={current === f.value ? 'page' : undefined}
          className={cn(buttonVariants({ variant: current === f.value ? 'default' : 'outline' }), 'h-11 px-4')}
        >
          {f.label}
        </Link>
      ))}
    </nav>
  )
}
