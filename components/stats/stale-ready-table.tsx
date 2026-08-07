'use client'

import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import type { StaleReadySong } from '@/lib/types'

const columns: DataTableColumn<StaleReadySong>[] = [
  {
    key: 'title',
    header: 'Title',
    render: (s) => <span className="font-medium">{s.title}</span>,
    sortValue: (s) => s.title.toLowerCase(),
  },
  {
    key: 'artist',
    header: 'Artist',
    render: (s) => <span className="text-muted-foreground">{s.artist ?? '—'}</span>,
    sortValue: (s) => (s.artist ?? '').toLowerCase(),
  },
  {
    key: 'key',
    header: 'Key',
    render: (s) => <span className="text-muted-foreground">{s.key ?? '—'}</span>,
    sortValue: (s) => (s.key ?? '').toLowerCase(),
  },
  {
    key: 'lastPlayed',
    header: 'Last Played',
    align: 'right',
    render: (s) => (
      <span className="text-muted-foreground">
        {s.gigsSinceLastPlayed === null ? 'Never' : `${s.gigsSinceLastPlayed} gigs ago`}
      </span>
    ),
    // Never-played songs are the most stale — sort them past any finite count.
    sortValue: (s) => s.gigsSinceLastPlayed ?? Number.POSITIVE_INFINITY,
  },
]

export function StaleReadyTable({ data }: { data: StaleReadySong[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      getRowKey={(s) => s.songId}
      renderMobileItem={(s) => (
        <li
          key={s.songId}
          className="flex items-center justify-between gap-2 rounded-lg border p-3"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">{s.title}</div>
            {s.artist && <div className="truncate text-sm text-muted-foreground">{s.artist}</div>}
          </div>
          <span className="shrink-0 text-sm text-muted-foreground">
            {s.gigsSinceLastPlayed === null ? 'Never' : `${s.gigsSinceLastPlayed} gigs ago`}
          </span>
        </li>
      )}
    />
  )
}
