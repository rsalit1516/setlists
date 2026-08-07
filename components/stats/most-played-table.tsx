'use client'

import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import type { MostPlayedSong } from '@/lib/types'

const columns: DataTableColumn<MostPlayedSong>[] = [
  {
    key: 'rank',
    header: '#',
    className: 'w-10',
    render: (_s, i) => <span className="text-muted-foreground">{i + 1}</span>,
  },
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
    key: 'playCount',
    header: 'Plays',
    align: 'right',
    render: (s) => s.playCount,
    sortValue: (s) => s.playCount,
  },
]

export function MostPlayedTable({ data }: { data: MostPlayedSong[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      getRowKey={(s) => s.songId}
      renderMobileItem={(s, i) => (
        <li
          key={s.songId}
          className="flex items-center justify-between gap-2 rounded-lg border p-3"
        >
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-sm text-muted-foreground">{i + 1}.</span>
            <div className="min-w-0">
              <div className="truncate font-medium">{s.title}</div>
              {s.artist && <div className="truncate text-sm text-muted-foreground">{s.artist}</div>}
            </div>
          </div>
          <span className="shrink-0 text-sm font-medium tabular-nums">
            {s.playCount} play{s.playCount !== 1 ? 's' : ''}
          </span>
        </li>
      )}
    />
  )
}
