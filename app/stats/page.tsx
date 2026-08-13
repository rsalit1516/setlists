import { cookies } from "next/headers";
import {
  getMostPlayedSongs,
  getReadySongsNeverPlayed,
  getStaleReadySongs,
  getStaleInProgressSongs,
  getUnpaidGigs,
  getScheduleGaps,
  getNextGapDaysOut,
} from "@/lib/services/stats";
import { STALE_WINDOW_COOKIE, resolveStaleWindow } from "@/lib/stale-window";
import {
  GAP_DAYS_COOKIE,
  GAP_LOOKAHEAD_COOKIE,
  resolveGapDays,
  resolveGapLookaheadMonths,
} from "@/lib/schedule-gaps-filter";
import { StatStrip, StatCard } from "@/components/stats/stat-card";
import { StaleWindowToggle } from "@/components/stats/stale-window-toggle";
import { GapDaysSelect } from "@/components/stats/gap-days-select";
import { GapLookaheadSelect } from "@/components/stats/gap-lookahead-select";
import { MostPlayedTable } from "@/components/stats/most-played-table";
import { ReadyNeverPlayedTable } from "@/components/stats/ready-never-played-table";
import { StaleReadyTable } from "@/components/stats/stale-ready-table";
import { StuckInProgressTable } from "@/components/stats/stuck-in-progress-table";
import { UnpaidGigsTable } from "@/components/stats/unpaid-gigs-table";
import { ScheduleGapsTable } from "@/components/stats/schedule-gaps-table";

function formatMoney(amount: string | number) {
  return `$${(typeof amount === "string" ? parseFloat(amount) : amount).toFixed(2)}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-heading text-lg font-bold">{children}</h2>;
}

function SectionHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; gapDays?: string; gapMonths?: string }>;
}) {
  const { window: windowParam, gapDays: gapDaysParam, gapMonths: gapMonthsParam } =
    await searchParams;
  const cookieStore = await cookies();
  const gigWindow = resolveStaleWindow(
    windowParam,
    cookieStore.get(STALE_WINDOW_COOKIE)?.value,
  );
  const gapDays = resolveGapDays(
    gapDaysParam,
    cookieStore.get(GAP_DAYS_COOKIE)?.value,
  );
  const gapLookaheadMonths = resolveGapLookaheadMonths(
    gapMonthsParam,
    cookieStore.get(GAP_LOOKAHEAD_COOKIE)?.value,
  );

  const [
    mostPlayed,
    neverPlayed,
    staleReady,
    staleInProgress,
    unpaidGigs,
    scheduleGaps,
  ] = await Promise.all([
    getMostPlayedSongs(),
    getReadySongsNeverPlayed(),
    getStaleReadySongs(gigWindow),
    getStaleInProgressSongs(),
    getUnpaidGigs(),
    getScheduleGaps(gapLookaheadMonths, gapDays),
  ]);

  const unpaidBalanceTotal = unpaidGigs.reduce(
    (sum, g) => sum + g.outstandingBalance,
    0,
  );
  const nextGapDaysOut = getNextGapDaysOut(scheduleGaps);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-8 sm:py-10 sm:pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold sm:text-[30px]">
          Stats
        </h1>
        <p className="text-sm text-muted-foreground">
          A quick read on what needs attention across the set.
        </p>
      </div>

      <StatStrip>
        <StatCard
          href="#ready-never-played"
          label="Ready, never played"
          value={neverPlayed.length}
        />
        <StatCard
          href="#stale-ready"
          label={`Stale ready (last ${gigWindow})`}
          value={staleReady.length}
        />
        <StatCard
          href="#stuck-in-progress"
          label="Stuck in progress"
          value={staleInProgress.length}
        />
        <StatCard
          href="#unpaid-gigs"
          label="Outstanding balance"
          value={formatMoney(unpaidBalanceTotal)}
          sub={`${unpaidGigs.length} gig${unpaidGigs.length !== 1 ? "s" : ""}`}
          tone="danger"
        />
        <StatCard
          href="#schedule-gaps"
          label="Next schedule gap"
          value={nextGapDaysOut === null ? "None" : `${nextGapDaysOut}d`}
          sub={
            nextGapDaysOut === null
              ? `in next ${gapLookaheadMonths} months`
              : nextGapDaysOut === 0
                ? "open now"
                : "days out"
          }
        />
      </StatStrip>

      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(480px,100%),1fr))] gap-6">
        <section id="unpaid-gigs" className="flex min-w-0 flex-col gap-4">
          <SectionTitle>Gigs Where We Haven&rsquo;t Been Paid</SectionTitle>
          {unpaidGigs.length === 0 ? (
            <EmptyState>No outstanding payments.</EmptyState>
          ) : (
            <UnpaidGigsTable data={unpaidGigs} />
          )}
        </section>

        <section id="schedule-gaps" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle>Upcoming Schedule Gaps</SectionTitle>
            <div className="flex flex-wrap items-center gap-2">
              <GapDaysSelect active={gapDays} lookaheadMonths={gapLookaheadMonths} />
              <GapLookaheadSelect active={gapLookaheadMonths} gapDays={gapDays} />
            </div>
          </div>
          <SectionHint>
            Stretches longer than {gapDays} days between gigs, looking{" "}
            {gapLookaheadMonths} months ahead.
          </SectionHint>
          {scheduleGaps.length === 0 ? (
            <EmptyState>
              No gaps — the schedule looks solid for the next{" "}
              {gapLookaheadMonths} months.
            </EmptyState>
          ) : (
            // Keyed on gapDays/gapLookaheadMonths so switching either control
            // remounts the table instead of preserving stale sort/pagination
            // state across data changes — same pattern as StaleReadyTable below.
            <ScheduleGapsTable
              key={`${gapDays}-${gapLookaheadMonths}`}
              data={scheduleGaps}
            />
          )}
        </section>

        <section id="most-played" className="flex min-w-0 flex-col gap-4">
          <SectionTitle>Most Played Songs</SectionTitle>
          {mostPlayed.length === 0 ? (
            <EmptyState>No songs have been played yet.</EmptyState>
          ) : (
            <MostPlayedTable data={mostPlayed} />
          )}
        </section>

        <section
          id="ready-never-played"
          className="flex min-w-0 flex-col gap-4"
        >
          <SectionTitle>Ready Songs Never Played</SectionTitle>
          {neverPlayed.length === 0 ? (
            <EmptyState>Every Ready song has been played.</EmptyState>
          ) : (
            <ReadyNeverPlayedTable data={neverPlayed} />
          )}
        </section>

        <section id="stale-ready" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle>Ready Songs Not Played Recently</SectionTitle>
            <StaleWindowToggle active={gigWindow} />
          </div>
          <SectionHint>
            Ready songs not played in any of the last {gigWindow} gigs —
            distinct from songs never played at all (above).
          </SectionHint>
          {staleReady.length === 0 ? (
            <EmptyState>
              Every Ready song has been played within the last {gigWindow} gigs.
            </EmptyState>
          ) : (
            // Keyed on gigWindow so switching the Last 5/10/20 toggle remounts the
            // table instead of preserving stale sort/pagination state across data changes.
            <StaleReadyTable key={gigWindow} data={staleReady} />
          )}
        </section>

        <section id="stuck-in-progress" className="flex min-w-0 flex-col gap-4">
          <SectionTitle>Songs Stuck In Progress</SectionTitle>
          <SectionHint>
            Based on last edit date, not time spent In Progress specifically —
            any field edit resets the clock, so this is an approximation of
            &ldquo;untouched,&rdquo; not a precise measure.
          </SectionHint>
          {staleInProgress.length === 0 ? (
            <EmptyState>No In Progress songs have stalled.</EmptyState>
          ) : (
            <StuckInProgressTable data={staleInProgress} />
          )}
        </section>
      </div>
    </div>
  );
}
