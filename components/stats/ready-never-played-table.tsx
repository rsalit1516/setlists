'use client'

import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import type { ReadySongNeverPlayed } from '@/lib/types'

const columns: DataTableColumn<ReadySongNeverPlayed>[] = [
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
]

export function ReadyNeverPlayedTable({ data }: { data: ReadySongNeverPlayed[] }) {
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
          {s.key && <span className="shrink-0 text-sm text-muted-foreground">{s.key}</span>}
        </li>
      )}
    />
  )
}
