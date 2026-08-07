'use client'

import Link from 'next/link'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { TableCell, TableRow } from '@/components/ui/table'
import type { FinanceGigRow, FinanceYearSummary } from '@/lib/types'

function fmt(amount: number) {
  const sign = amount < 0 ? '−' : ''
  return `${sign}$${Math.abs(amount).toFixed(2)}`
}

function fmtStr(amount: string | null) {
  if (!amount) return '—'
  return `$${parseFloat(amount).toFixed(2)}`
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <>
      <dt className={emphasis ? 'font-medium' : 'text-muted-foreground'}>{label}</dt>
      <dd className={`text-right ${emphasis ? 'font-medium' : ''}`}>{value}</dd>
    </>
  )
}

const columns: DataTableColumn<FinanceGigRow>[] = [
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
    render: (g) => <span className="text-muted-foreground">{g.venueName}</span>,
    sortValue: (g) => g.venueName.toLowerCase(),
  },
  {
    key: 'contracted',
    header: 'Contracted',
    align: 'right',
    render: (g) => fmtStr(g.amountContracted),
    sortValue: (g) => (g.amountContracted ? parseFloat(g.amountContracted) : 0),
  },
  {
    key: 'paid',
    header: 'Paid by venue',
    align: 'right',
    render: (g) => fmtStr(g.amountPaid),
    sortValue: (g) => (g.amountPaid ? parseFloat(g.amountPaid) : 0),
  },
  {
    key: 'tips',
    header: 'Tips',
    align: 'right',
    render: (g) => fmtStr(g.tips),
    sortValue: (g) => (g.tips ? parseFloat(g.tips) : 0),
  },
  {
    key: 'otherRevenue',
    header: 'Other revenue',
    align: 'right',
    render: (g) => fmtStr(g.otherRevenue),
    sortValue: (g) => (g.otherRevenue ? parseFloat(g.otherRevenue) : 0),
  },
  {
    key: 'expenses',
    header: 'Expenses',
    align: 'right',
    render: (g) => (g.totalExpenses > 0 ? fmt(-g.totalExpenses) : '—'),
    sortValue: (g) => g.totalExpenses,
  },
  {
    key: 'musicianPayouts',
    header: 'Musician payouts',
    align: 'right',
    render: (g) => (g.totalMusicianPayouts > 0 ? fmt(g.totalMusicianPayouts) : '—'),
    sortValue: (g) => g.totalMusicianPayouts,
  },
  {
    key: 'net',
    header: 'Net',
    align: 'right',
    className: 'font-medium',
    render: (g) => fmt(g.net),
    sortValue: (g) => g.net,
  },
]

export function FinanceGigsTable({ data, totals }: { data: FinanceGigRow[]; totals: FinanceYearSummary }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      getRowKey={(g) => g.id}
      renderMobileItem={(g) => (
        <li key={g.id} className="rounded-lg border p-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <Link href={`/gigs/${g.id}`} className="font-medium hover:underline">
              {formatDate(g.date)}
            </Link>
            <span className="truncate text-sm text-muted-foreground">{g.venueName}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <StatRow label="Contracted" value={fmtStr(g.amountContracted)} />
            <StatRow label="Paid by venue" value={fmtStr(g.amountPaid)} />
            <StatRow label="Tips" value={fmtStr(g.tips)} />
            <StatRow label="Other revenue" value={fmtStr(g.otherRevenue)} />
            <StatRow label="Expenses" value={g.totalExpenses > 0 ? fmt(-g.totalExpenses) : '—'} />
            <StatRow
              label="Musician payouts"
              value={g.totalMusicianPayouts > 0 ? fmt(g.totalMusicianPayouts) : '—'}
            />
            <StatRow label="Net" value={fmt(g.net)} emphasis />
          </dl>
        </li>
      )}
      footer={
        <TableRow>
          <TableCell colSpan={2}>Total ({totals.gigCount})</TableCell>
          <TableCell className="text-right">{fmt(totals.totalContracted)}</TableCell>
          <TableCell className="text-right">{fmt(totals.totalPaidByVenue)}</TableCell>
          <TableCell className="text-right">{fmt(totals.totalTips)}</TableCell>
          <TableCell className="text-right">{fmt(totals.totalOtherRevenue)}</TableCell>
          <TableCell className="text-right">{fmt(-totals.totalExpenses)}</TableCell>
          <TableCell className="text-right">{fmt(totals.totalMusicianPayouts)}</TableCell>
          <TableCell className="text-right">{fmt(totals.net)}</TableCell>
        </TableRow>
      }
      mobileFooter={
        <li className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-2 font-semibold">
            Total ({totals.gigCount} gig{totals.gigCount !== 1 ? 's' : ''})
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <StatRow label="Contracted" value={fmt(totals.totalContracted)} />
            <StatRow label="Paid by venue" value={fmt(totals.totalPaidByVenue)} />
            <StatRow label="Tips" value={fmt(totals.totalTips)} />
            <StatRow label="Other revenue" value={fmt(totals.totalOtherRevenue)} />
            <StatRow label="Expenses" value={fmt(-totals.totalExpenses)} />
            <StatRow label="Musician payouts" value={fmt(totals.totalMusicianPayouts)} />
            <StatRow label="Net" value={fmt(totals.net)} emphasis />
          </dl>
        </li>
      }
    />
  )
}
