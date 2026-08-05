import Link from 'next/link'
import {
  getMostPlayedSongs,
  getReadySongsNeverPlayed,
  getStaleReadySongs,
  DEFAULT_STALE_GIG_WINDOW,
  getStaleInProgressSongs,
  getUnpaidGigs,
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
import type { UnpaidGig } from '@/lib/types'

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

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>
}) {
  const { window: windowParam } = await searchParams
  const gigWindow = parseGigWindow(windowParam)

  const [mostPlayed, neverPlayed, staleReady, staleInProgress, unpaidGigs] = await Promise.all([
    getMostPlayedSongs(),
    getReadySongsNeverPlayed(),
    getStaleReadySongs(gigWindow),
    getStaleInProgressSongs(),
    getUnpaidGigs(),
  ])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Stats</h1>

      <section className="mb-10">
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

      <section className="mb-10">
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

      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Ready Songs Not Played Recently
          </h2>
          <div className="flex gap-2">
            {WINDOW_OPTIONS.map((w) => (
              <Link
                key={w}
                href={`/stats?window=${w}`}
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

      <section>
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

      <section>
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
    </div>
  )
}
