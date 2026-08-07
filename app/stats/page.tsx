import {
  getMostPlayedSongs,
  getReadySongsNeverPlayed,
  getStaleReadySongs,
  DEFAULT_STALE_GIG_WINDOW,
  getStaleInProgressSongs,
  getUnpaidGigs,
  getScheduleGaps,
  getNextGapDaysOut,
  DEFAULT_GAP_LOOKAHEAD_MONTHS,
  DEFAULT_GAP_DAYS,
} from '@/lib/services/stats'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { MostPlayedTable } from '@/components/stats/most-played-table'
import { ReadyNeverPlayedTable } from '@/components/stats/ready-never-played-table'
import { StaleReadyTable } from '@/components/stats/stale-ready-table'
import { StuckInProgressTable } from '@/components/stats/stuck-in-progress-table'
import { UnpaidGigsTable } from '@/components/stats/unpaid-gigs-table'
import { ScheduleGapsTable } from '@/components/stats/schedule-gaps-table'

const WINDOW_OPTIONS = [5, 10, 20]

function parseGigWindow(value: string | undefined): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_STALE_GIG_WINDOW
}

function formatMoney(amount: string | number) {
  return `$${(typeof amount === 'string' ? parseFloat(amount) : amount).toFixed(2)}`
}

// Clickable summary tile linking down to its detail section — used for the
// metrics strip at the top of the page. Plain <a> (not next/link) since it's
// a same-page hash anchor, not a route change.
function MetricCard({
  href,
  label,
  value,
  sub,
}: {
  href: string
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <a
      href={href}
      className="flex min-h-[44px] min-w-0 flex-col gap-1 rounded-lg border bg-card p-3 transition-colors hover:border-primary/50"
    >
      <span className="min-w-0 text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </a>
  )
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>
}) {
  const { window: windowParam } = await searchParams
  const gigWindow = parseGigWindow(windowParam)

  const [mostPlayed, neverPlayed, staleReady, staleInProgress, unpaidGigs, scheduleGaps] =
    await Promise.all([
      getMostPlayedSongs(),
      getReadySongsNeverPlayed(),
      getStaleReadySongs(gigWindow),
      getStaleInProgressSongs(),
      getUnpaidGigs(),
      getScheduleGaps(),
    ])

  const unpaidBalanceTotal = unpaidGigs.reduce((sum, g) => sum + g.outstandingBalance, 0)
  const nextGapDaysOut = getNextGapDaysOut(scheduleGaps)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Stats</h1>

      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <MetricCard
          href="#ready-never-played"
          label="Ready, Never Played"
          value={neverPlayed.length}
        />
        <MetricCard
          href="#stale-ready"
          label={`Stale Ready (Last ${gigWindow})`}
          value={staleReady.length}
        />
        <MetricCard
          href="#stuck-in-progress"
          label="Stuck In Progress"
          value={staleInProgress.length}
        />
        <MetricCard
          href="#unpaid-gigs"
          label="Outstanding Balance"
          value={formatMoney(unpaidBalanceTotal)}
          sub={`${unpaidGigs.length} gig${unpaidGigs.length !== 1 ? 's' : ''}`}
        />
        <MetricCard
          href="#schedule-gaps"
          label="Next Schedule Gap"
          value={nextGapDaysOut === null ? 'None' : `${nextGapDaysOut}d`}
          sub={
            nextGapDaysOut === null
              ? `in next ${DEFAULT_GAP_LOOKAHEAD_MONTHS} months`
              : nextGapDaysOut === 0
                ? 'open now'
                : 'days out'
          }
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] gap-4">
        <section id="most-played" className="min-w-0 rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Most Played Songs
          </h2>
          {mostPlayed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No songs have been played yet.</p>
          ) : (
            <MostPlayedTable data={mostPlayed} />
          )}
        </section>

        <section id="ready-never-played" className="min-w-0 rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Ready Songs Never Played
          </h2>
          {neverPlayed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every Ready song has been played.</p>
          ) : (
            <ReadyNeverPlayedTable data={neverPlayed} />
          )}
        </section>

        <section id="stale-ready" className="min-w-0 rounded-lg border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
              Ready Songs Not Played Recently
            </h2>
            <div className="flex gap-2">
              {WINDOW_OPTIONS.map((w) => (
                <Link
                  key={w}
                  href={`/stats?window=${w}#stale-ready`}
                  className={cn(
                    buttonVariants({ variant: w === gigWindow ? 'default' : 'outline', size: 'sm' }),
                    'h-9 px-3'
                  )}
                >
                  Last {w}
                </Link>
              ))}
            </div>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Ready songs not played in any of the last {gigWindow} gigs — distinct from songs never
            played at all (above).
          </p>
          {staleReady.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every Ready song has been played within the last {gigWindow} gigs.
            </p>
          ) : (
            // Keyed on gigWindow so switching the Last 5/10/20 toggle remounts the
            // table instead of preserving stale sort/pagination state across data changes.
            <StaleReadyTable key={gigWindow} data={staleReady} />
          )}
        </section>

        <section id="stuck-in-progress" className="min-w-0 rounded-lg border bg-card p-4">
          <h2 className="mb-1 text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Songs Stuck In Progress
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Based on last edited date, not time spent In Progress specifically — any field edit
            resets the clock, so this is an approximation of &ldquo;untouched,&rdquo; not a precise measure.
          </p>
          {staleInProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground">No In Progress songs have stalled.</p>
          ) : (
            <StuckInProgressTable data={staleInProgress} />
          )}
        </section>

        <section id="unpaid-gigs" className="min-w-0 rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Gigs Where We Haven&rsquo;t Been Paid
          </h2>
          {unpaidGigs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outstanding payments.</p>
          ) : (
            <UnpaidGigsTable data={unpaidGigs} />
          )}
        </section>

        <section id="schedule-gaps" className="min-w-0 rounded-lg border bg-card p-4">
          <h2 className="mb-1 text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming Schedule Gaps
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Stretches longer than {DEFAULT_GAP_DAYS} days between gigs, looking{' '}
            {DEFAULT_GAP_LOOKAHEAD_MONTHS} months ahead.
          </p>
          {scheduleGaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No gaps — the schedule looks solid for the next {DEFAULT_GAP_LOOKAHEAD_MONTHS} months.
            </p>
          ) : (
            <ScheduleGapsTable data={scheduleGaps} />
          )}
        </section>
      </div>
    </div>
  )
}
