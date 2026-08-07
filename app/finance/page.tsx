import { getFinanceReport } from '@/lib/services/finance'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FinanceGigsTable } from '@/components/finance/gigs-table'
import type { FinanceYearSummary } from '@/lib/types'

function fmt(amount: number) {
  const sign = amount < 0 ? '−' : ''
  return `${sign}$${Math.abs(amount).toFixed(2)}`
}

function StatRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <>
      <dt className={emphasis ? 'font-medium' : 'text-muted-foreground'}>{label}</dt>
      <dd className={`text-right ${emphasis ? 'font-medium' : ''}`}>{value}</dd>
    </>
  )
}

function YearStatCard({ summary }: { summary: FinanceYearSummary }) {
  return (
    <li className="rounded-lg border p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-lg font-semibold">{summary.year}</span>
        <span className="text-sm text-muted-foreground">
          {summary.gigCount} gig{summary.gigCount !== 1 ? 's' : ''}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <StatRow label="Contracted" value={fmt(summary.totalContracted)} />
        <StatRow label="Paid by venue" value={fmt(summary.totalPaidByVenue)} />
        <StatRow label="Tips" value={fmt(summary.totalTips)} />
        <StatRow label="Other revenue" value={fmt(summary.totalOtherRevenue)} />
        <StatRow label="Expenses" value={fmt(-summary.totalExpenses)} />
        <StatRow label="Musician payouts" value={fmt(summary.totalMusicianPayouts)} />
        <StatRow label="Net" value={fmt(summary.net)} emphasis />
      </dl>
    </li>
  )
}

const MONEY_HEADS = ['Contracted', 'Paid by venue', 'Tips', 'Other revenue', 'Expenses', 'Musician payouts', 'Net']

export default async function FinancePage() {
  const report = await getFinanceReport()

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Finance</h1>

      {/* Past years */}
      <section className="mb-10">
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
          Past Years
        </h2>
        {report.pastYears.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past years yet.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Gigs</TableHead>
                    {MONEY_HEADS.map((h) => (
                      <TableHead key={h} className="text-right">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.pastYears.map((y) => (
                    <TableRow key={y.year}>
                      <TableCell className="font-medium">{y.year}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{y.gigCount}</TableCell>
                      <TableCell className="text-right">{fmt(y.totalContracted)}</TableCell>
                      <TableCell className="text-right">{fmt(y.totalPaidByVenue)}</TableCell>
                      <TableCell className="text-right">{fmt(y.totalTips)}</TableCell>
                      <TableCell className="text-right">{fmt(y.totalOtherRevenue)}</TableCell>
                      <TableCell className="text-right">{fmt(-y.totalExpenses)}</TableCell>
                      <TableCell className="text-right">{fmt(y.totalMusicianPayouts)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(y.net)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="space-y-3 md:hidden">
              {report.pastYears.map((y) => (
                <YearStatCard key={y.year} summary={y} />
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Current year */}
      <section>
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
          {report.currentYear}
        </h2>
        {report.currentYearGigs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No gigs yet this year.</p>
        ) : (
          <FinanceGigsTable data={report.currentYearGigs} totals={report.currentYearTotals} />
        )}
      </section>
    </div>
  )
}
