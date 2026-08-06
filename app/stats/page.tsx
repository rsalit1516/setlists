import Link from 'next/link'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { UnpaidGig, ScheduleGapSide } from '@/lib/types'

const WINDOW_OPTIONS = [5, 10, 20]

function parseGigWindow(value: string | undefined): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_STALE_GIG_WINDOW
}

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

function GapSideLabel({ side }: { side: ScheduleGapSide }) {
  if (side.type === 'today') return <>Today</>
  if (side.type === 'open') return <>No gig scheduled yet</>
  return (
    <Link href={`/gigs/${side.gigId}`} className="hover:underline">
      {side.venueName} ({formatDate(side.date)})
    </Link>
  )
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
            <>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead className="text-right">Plays</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mostPlayed.map((s, i) => (
                      <TableRow key={s.songId}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell className="text-muted-foreground">{s.artist ?? '—'}</TableCell>
                        <TableCell className="text-right">{s.playCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ol className="space-y-2 md:hidden">
                {mostPlayed.map((s, i) => (
                  <li
                    key={s.songId}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="text-sm text-muted-foreground">{i + 1}.</span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{s.title}</div>
                        {s.artist && (
                          <div className="truncate text-sm text-muted-foreground">{s.artist}</div>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {s.playCount} play{s.playCount !== 1 ? 's' : ''}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        <section id="ready-never-played" className="min-w-0 rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Ready Songs Never Played
          </h2>
          {neverPlayed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every Ready song has been played.</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead>Key</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {neverPlayed.map((s) => (
                      <TableRow key={s.songId}>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell className="text-muted-foreground">{s.artist ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{s.key ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="space-y-2 md:hidden">
                {neverPlayed.map((s) => (
                  <li
                    key={s.songId}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.title}</div>
                      {s.artist && (
                        <div className="truncate text-sm text-muted-foreground">{s.artist}</div>
                      )}
                    </div>
                    {s.key && (
                      <span className="shrink-0 text-sm text-muted-foreground">{s.key}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
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
            <>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead className="text-right">Last Played</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staleReady.map((s) => (
                      <TableRow key={s.songId}>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell className="text-muted-foreground">{s.artist ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{s.key ?? '—'}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {s.gigsSinceLastPlayed === null
                            ? 'Never'
                            : `${s.gigsSinceLastPlayed} gigs ago`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="space-y-2 md:hidden">
                {staleReady.map((s) => (
                  <li
                    key={s.songId}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.title}</div>
                      {s.artist && (
                        <div className="truncate text-sm text-muted-foreground">{s.artist}</div>
                      )}
                    </div>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {s.gigsSinceLastPlayed === null ? 'Never' : `${s.gigsSinceLastPlayed} gigs ago`}
                    </span>
                  </li>
                ))}
              </ul>
            </>
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
            <>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead className="text-right">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staleInProgress.map((s) => (
                      <TableRow key={s.songId}>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell className="text-muted-foreground">{s.artist ?? '—'}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {s.daysSinceUpdate} days ago
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="space-y-2 md:hidden">
                {staleInProgress.map((s) => (
                  <li
                    key={s.songId}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.title}</div>
                      {s.artist && (
                        <div className="truncate text-sm text-muted-foreground">{s.artist}</div>
                      )}
                    </div>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {s.daysSinceUpdate} days ago
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section id="unpaid-gigs" className="min-w-0 rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Gigs Where We Haven&rsquo;t Been Paid
          </h2>
          {unpaidGigs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outstanding payments.</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Contracted</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidGigs.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>
                          <Link href={`/gigs/${g.id}`} className="hover:underline">
                            {formatDate(g.date)}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium">{g.venueName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={PAID_STATUS_BADGE[g.paidStatus].className}>
                            {PAID_STATUS_BADGE[g.paidStatus].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatMoney(g.amountContracted)}</TableCell>
                        <TableCell className="text-right">
                          {g.amountPaid ? formatMoney(g.amountPaid) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(g.outstandingBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="space-y-2 md:hidden">
                {unpaidGigs.map((g) => (
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
                ))}
              </ul>
            </>
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
            <>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Gap</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleGaps.map((g, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <GapSideLabel side={g.from} />
                        </TableCell>
                        <TableCell>
                          <GapSideLabel side={g.to} />
                        </TableCell>
                        <TableCell className="text-right font-medium">{g.days} days</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="space-y-2 md:hidden">
                {scheduleGaps.map((g, i) => (
                  <li key={i} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-x-1 text-sm">
                      <GapSideLabel side={g.from} />
                      <span className="text-muted-foreground">→</span>
                      <GapSideLabel side={g.to} />
                    </div>
                    <div className="mt-1 text-sm font-medium">{g.days} days</div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
