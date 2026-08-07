'use client'

import Link from 'next/link'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import type { ScheduleGap, ScheduleGapSide } from '@/lib/types'

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function GapSideLabel({ side }: { side: ScheduleGapSide }) {
  if (side.type === 'today') return <>Today</>
  if (side.type === 'open') return <>No gig scheduled yet</>
  return (
    <Link href={`/gigs/${side.gigId}`} className="hover:underline">
      {side.venueName} ({formatDate(side.date)})
    </Link>
  )
}

const columns: DataTableColumn<ScheduleGap>[] = [
  {
    key: 'from',
    header: 'From',
    render: (g) => <GapSideLabel side={g.from} />,
  },
  {
    key: 'to',
    header: 'To',
    render: (g) => <GapSideLabel side={g.to} />,
  },
  {
    key: 'days',
    header: 'Gap',
    align: 'right',
    className: 'font-medium',
    render: (g) => `${g.days} days`,
    sortValue: (g) => g.days,
  },
]

export function ScheduleGapsTable({ data }: { data: ScheduleGap[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      getRowKey={(g, i) => `${g.days}-${i}`}
      renderMobileItem={(g, i) => (
        <li key={`${g.days}-${i}`} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-x-1 text-sm">
            <GapSideLabel side={g.from} />
            <span className="text-muted-foreground">→</span>
            <GapSideLabel side={g.to} />
          </div>
          <div className="mt-1 text-sm font-medium">{g.days} days</div>
        </li>
      )}
    />
  )
}
