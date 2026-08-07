'use client'

import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import type { StaleInProgressSong } from '@/lib/types'

const columns: DataTableColumn<StaleInProgressSong>[] = [
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
    key: 'lastUpdated',
    header: 'Last Updated',
    align: 'right',
    render: (s) => <span className="text-muted-foreground">{s.daysSinceUpdate} days ago</span>,
    sortValue: (s) => s.daysSinceUpdate,
  },
]

export function StuckInProgressTable({ data }: { data: StaleInProgressSong[] }) {
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
          <span className="shrink-0 text-sm text-muted-foreground">{s.daysSinceUpdate} days ago</span>
        </li>
      )}
    />
  )
}
