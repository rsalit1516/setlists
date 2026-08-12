import Link from 'next/link'
import { cn } from '@/lib/utils'
import { GAP_DAYS_COOKIE, GAP_DAYS_OPTIONS } from '@/lib/schedule-gaps-filter'

// Segmented control for the schedule-gap days threshold. Persisted via the
// shared /api/preferences cookie route (#56) — same pattern as
// components/stats/stale-window-toggle.tsx. `lookaheadMonths` is carried
// through into each redirect so switching the days threshold doesn't drop an
// explicit `?gapMonths=` the user arrived with.
export function GapDaysToggle({
  active,
  lookaheadMonths,
}: {
  active: number
  lookaheadMonths: number
}) {
  return (
    <div className="flex gap-1.5">
      {GAP_DAYS_OPTIONS.map((d) => (
        <Link
          key={d}
          href={`/api/preferences?cookie=${GAP_DAYS_COOKIE}&value=${d}&redirect=${encodeURIComponent(`/stats?gapDays=${d}&gapMonths=${lookaheadMonths}#schedule-gaps`)}`}
          aria-current={Number(d) === active}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            Number(d) === active
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          )}
        >
          {d}d
        </Link>
      ))}
    </div>
  )
}
