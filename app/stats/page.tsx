import Link from 'next/link'
import {
  getMostPlayedSongs,
  getReadySongsNeverPlayed,
  getStaleReadySongs,
  DEFAULT_STALE_GIG_WINDOW,
  getStaleInProgressSongs,
  getScheduleGaps,
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
import { cn } from '@/lib/utils'
import type { ScheduleGapSide } from '@/lib/types'

const WINDOW_OPTIONS = [5, 10, 20]

function parseGigWindow(value: string | undefined): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_STALE_GIG_WINDOW
}

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

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>
}) {
  const { window: windowParam } = await searchParams
  const gigWindow = parseGigWindow(windowParam)

  const [mostPlayed, neverPlayed, staleReady, staleInProgress, scheduleGaps] = await Promise.all([
    getMostPlayedSongs(),
    getReadySongsNeverPlayed(),
    getStaleReadySongs(gigWindow),
    getStaleInProgressSongs(),
    getScheduleGaps(),
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
  )
}
