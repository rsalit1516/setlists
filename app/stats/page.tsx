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
import { StatStrip, StatCard } from '@/components/stats/stat-card'
import { RowList, Row, RowTitle } from '@/components/stats/row-list'
import { Pill } from '@/components/stats/pill'
import { ProgressBar } from '@/components/stats/progress-bar'
import { StaleWindowToggle } from '@/components/stats/stale-window-toggle'
import type { UnpaidGig, ScheduleGapSide } from '@/lib/types'

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

// Reuses the Pill component's tone tokens: unpaid mirrors the danger/financials
// pairing on the Outstanding Balance stat card, partial mirrors the staleness amber.
const PAID_STATUS_PILL: Record<UnpaidGig['paidStatus'], { label: string; tone: 'danger' | 'stale' }> = {
  unpaid: { label: 'Unpaid', tone: 'danger' },
  partial: { label: 'Partially Paid', tone: 'stale' },
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-heading text-lg font-bold">{children}</h2>
}

function SectionHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-muted-foreground">{children}</p>
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
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
  const maxPlayCount = mostPlayed[0]?.playCount ?? 0

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-8 sm:py-10 sm:pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold sm:text-[30px]">Stats</h1>
        <p className="text-sm text-muted-foreground">
          A quick read on what needs attention across the set.
        </p>
      </div>

      <StatStrip>
        <StatCard href="#ready-never-played" label="Ready, never played" value={neverPlayed.length} />
        <StatCard
          href="#stale-ready"
          label={`Stale ready (last ${gigWindow})`}
          value={staleReady.length}
        />
        <StatCard href="#stuck-in-progress" label="Stuck in progress" value={staleInProgress.length} />
        <StatCard
          href="#unpaid-gigs"
          label="Outstanding balance"
          value={formatMoney(unpaidBalanceTotal)}
          sub={`${unpaidGigs.length} gig${unpaidGigs.length !== 1 ? 's' : ''}`}
          tone="danger"
        />
        <StatCard
          href="#schedule-gaps"
          label="Next schedule gap"
          value={nextGapDaysOut === null ? 'None' : `${nextGapDaysOut}d`}
          sub={
            nextGapDaysOut === null
              ? `in next ${DEFAULT_GAP_LOOKAHEAD_MONTHS} months`
              : nextGapDaysOut === 0
                ? 'open now'
                : 'days out'
          }
        />
      </StatStrip>

      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(480px,100%),1fr))] gap-6">
        <section id="unpaid-gigs" className="flex min-w-0 flex-col gap-4">
          <SectionTitle>Gigs Where We Haven&rsquo;t Been Paid</SectionTitle>
          {unpaidGigs.length === 0 ? (
            <EmptyState>No outstanding payments.</EmptyState>
          ) : (
            <RowList>
              {unpaidGigs.map((g) => (
                <Row key={g.id} className="justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/gigs/${g.id}`}
                      className="block truncate text-[14.5px] font-semibold hover:underline"
                    >
                      {g.venueName}
                    </Link>
                    <div className="truncate text-[12.5px] text-muted-foreground">
                      {formatDate(g.date)}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Pill tone={PAID_STATUS_PILL[g.paidStatus].tone}>
                      {PAID_STATUS_PILL[g.paidStatus].label}
                    </Pill>
                    <span className="text-[12.5px] font-semibold">
                      {formatMoney(g.outstandingBalance)} due
                    </span>
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </section>

        <section id="schedule-gaps" className="flex min-w-0 flex-col gap-4">
          <SectionTitle>Upcoming Schedule Gaps</SectionTitle>
          <SectionHint>
            Stretches longer than {DEFAULT_GAP_DAYS} days between gigs, looking{' '}
            {DEFAULT_GAP_LOOKAHEAD_MONTHS} months ahead.
          </SectionHint>
          {scheduleGaps.length === 0 ? (
            <EmptyState>
              No gaps — the schedule looks solid for the next {DEFAULT_GAP_LOOKAHEAD_MONTHS} months.
            </EmptyState>
          ) : (
            <RowList>
              {scheduleGaps.map((g, i) => (
                <Row key={i} className="justify-between">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-[14.5px]">
                    <GapSideLabel side={g.from} />
                    <span className="text-muted-foreground">→</span>
                    <GapSideLabel side={g.to} />
                  </div>
                  <span className="shrink-0 text-[12.5px] text-muted-foreground">{g.days} days</span>
                </Row>
              ))}
            </RowList>
          )}
        </section>

        <section id="most-played" className="flex min-w-0 flex-col gap-4">
          <SectionTitle>Most Played Songs</SectionTitle>
          {mostPlayed.length === 0 ? (
            <EmptyState>No songs have been played yet.</EmptyState>
          ) : (
            <RowList>
              {mostPlayed.map((s, i) => (
                <Row key={s.songId} className="grid grid-cols-[24px_1fr_100px]">
                  <span className="text-[13px] text-muted-foreground">{i + 1}</span>
                  <RowTitle title={s.title} subtitle={s.artist} />
                  <ProgressBar value={s.playCount} max={maxPlayCount} />
                </Row>
              ))}
            </RowList>
          )}
        </section>

        <section id="ready-never-played" className="flex min-w-0 flex-col gap-4">
          <SectionTitle>Ready Songs Never Played</SectionTitle>
          {neverPlayed.length === 0 ? (
            <EmptyState>Every Ready song has been played.</EmptyState>
          ) : (
            <RowList>
              {neverPlayed.map((s) => (
                <Row key={s.songId} className="justify-between">
                  <RowTitle title={s.title} subtitle={s.artist} />
                  {s.key ? (
                    <Pill tone="key">{s.key}</Pill>
                  ) : (
                    <span className="shrink-0 text-[12.5px] text-muted-foreground/70">—</span>
                  )}
                </Row>
              ))}
            </RowList>
          )}
        </section>

        <section id="stale-ready" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle>Ready Songs Not Played Recently</SectionTitle>
            <StaleWindowToggle active={gigWindow} />
          </div>
          <SectionHint>
            Ready songs not played in any of the last {gigWindow} gigs — distinct from songs never
            played at all (above).
          </SectionHint>
          {staleReady.length === 0 ? (
            <EmptyState>
              Every Ready song has been played within the last {gigWindow} gigs.
            </EmptyState>
          ) : (
            <RowList>
              {staleReady.map((s) => (
                <Row key={s.songId} className="justify-between">
                  <RowTitle
                    title={s.title}
                    subtitle={[s.artist, s.key].filter(Boolean).join(' · ') || undefined}
                  />
                  <span className="shrink-0 text-[12.5px] text-muted-foreground">
                    {s.gigsSinceLastPlayed === null ? 'Never' : `${s.gigsSinceLastPlayed} gigs ago`}
                  </span>
                </Row>
              ))}
            </RowList>
          )}
        </section>

        <section id="stuck-in-progress" className="flex min-w-0 flex-col gap-4">
          <SectionTitle>Songs Stuck In Progress</SectionTitle>
          <SectionHint>
            Based on last edit date, not time spent In Progress specifically — any field edit
            resets the clock, so this is an approximation of &ldquo;untouched,&rdquo; not a precise
            measure.
          </SectionHint>
          {staleInProgress.length === 0 ? (
            <EmptyState>No In Progress songs have stalled.</EmptyState>
          ) : (
            <RowList>
              {staleInProgress.map((s) => (
                <Row key={s.songId} className="justify-between">
                  <RowTitle title={s.title} subtitle={s.artist} />
                  <Pill tone="stale">{s.daysSinceUpdate}d</Pill>
                </Row>
              ))}
            </RowList>
          )}
        </section>
      </div>
    </div>
  )
}
