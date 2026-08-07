'use client'

import Link from 'next/link'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import type { UnpaidGig } from '@/lib/types'

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMoney(amount: string | number) {
  return `$${(typeof amount === 'string' ? parseFloat(amount) : amount).toFixed(2)}`
}

// Mirrors the PAYOUT_BADGE convention in app/gigs/[id]/page.tsx.
const PAID_STATUS_BADGE: Record<UnpaidGig['paidStatus'], { label: string; className: string }> = {
  unpaid: {
    label: 'Unpaid',
    className: 'border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-400',
  },
  partial: {
    label: 'Partially Paid',
    className: 'border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400',
  },
}

const columns: DataTableColumn<UnpaidGig>[] = [
  {
    key: 'date',
    header: 'Date',
    render: (g) => (
      <Link href={`/gigs/${g.id}`} className="hover:underline">
        {formatDate(g.date)}
      </Link>
    ),
    sortValue: (g) => new Date(g.date).getTime(),
  },
  {
    key: 'venue',
    header: 'Venue',
    render: (g) => <span className="font-medium">{g.venueName}</span>,
    sortValue: (g) => g.venueName.toLowerCase(),
  },
  {
    key: 'status',
    header: 'Status',
    render: (g) => (
      <Badge variant="outline" className={PAID_STATUS_BADGE[g.paidStatus].className}>
        {PAID_STATUS_BADGE[g.paidStatus].label}
      </Badge>
    ),
    sortValue: (g) => PAID_STATUS_BADGE[g.paidStatus].label,
  },
  {
    key: 'contracted',
    header: 'Contracted',
    align: 'right',
    render: (g) => formatMoney(g.amountContracted),
    sortValue: (g) => parseFloat(g.amountContracted),
  },
  {
    key: 'paid',
    header: 'Paid',
    align: 'right',
    render: (g) => (g.amountPaid ? formatMoney(g.amountPaid) : '—'),
    sortValue: (g) => (g.amountPaid ? parseFloat(g.amountPaid) : 0),
  },
  {
    key: 'outstanding',
    header: 'Outstanding',
    align: 'right',
    className: 'font-medium',
    render: (g) => formatMoney(g.outstandingBalance),
    sortValue: (g) => g.outstandingBalance,
  },
]

export function UnpaidGigsTable({ data }: { data: UnpaidGig[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      getRowKey={(g) => g.id}
      renderMobileItem={(g) => (
        <li key={g.id} className="rounded-lg border p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <Link href={`/gigs/${g.id}`} className="font-medium hover:underline">
              {g.venueName}
            </Link>
            <Badge variant="outline" className={PAID_STATUS_BADGE[g.paidStatus].className}>
              {PAID_STATUS_BADGE[g.paidStatus].label}
            </Badge>
          </div>
          <div className="mb-2 text-sm text-muted-foreground">{formatDate(g.date)}</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Contracted</dt>
            <dd className="text-right">{formatMoney(g.amountContracted)}</dd>
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="text-right">{g.amountPaid ? formatMoney(g.amountPaid) : '—'}</dd>
            <dt className="font-medium">Outstanding</dt>
            <dd className="text-right font-medium">{formatMoney(g.outstandingBalance)}</dd>
          </dl>
        </li>
      )}
    />
  )
}
