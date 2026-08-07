import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { addMonths, formatMonthParam, WEEKDAY_LABELS, type CalendarDay } from '@/lib/gigs-month'
import { formatQuarterHeading } from '@/lib/gigs-quarter'

function quarterHref(anchorMonth: Date) {
  return `/gigs?view=quarter&quarter=${formatMonthParam(anchorMonth)}`
}

function DotCell({ day }: { day: CalendarDay }) {
  // Caller (app/gigs/page.tsx) already scopes `day.gigs` to this month's own
  // range before calling buildMonthGrid, so padding cells never carry a gig.
  const gigs = day.gigs
  // Dots have no visible text, so screen readers need the date in the name —
  // otherwise multiple same-venue gigs across the strip announce identically.
  const dateLabel = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div
      className={cn(
        'relative flex min-h-11 flex-col items-center gap-1 bg-background p-1',
        !day.inCurrentMonth && 'bg-muted/30'
      )}
    >
      <span
        className={cn(
          'text-[11px] leading-none',
          day.inCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'
        )}
      >
        {day.date.getDate()}
      </span>

      {gigs.length === 1 && (
        // Single gig: the link covers the whole cell so the tap target stays
        // at the full min-h-11 cell instead of shrinking to the dot itself.
        <Link
          href={`/gigs/${gigs[0].id}`}
          title={`${gigs[0].venue.name}, ${dateLabel}`}
          aria-label={`Gig at ${gigs[0].venue.name}, ${dateLabel}`}
          className="absolute inset-0 flex items-end justify-center pb-1.5"
        >
          <span aria-hidden className="size-2 rounded-full bg-primary" />
        </Link>
      )}

      {gigs.length > 1 && (
        // Multiple gigs the same day is rare and the cell is only ~7% of a
        // mini-calendar's width, so each dot's own tap target can't reach the
        // usual 44px minimum without overlapping its neighbors.
        <div className="flex flex-wrap items-center justify-center gap-0.5">
          {gigs.map((gig) => (
            <Link
              key={gig.id}
              href={`/gigs/${gig.id}`}
              title={`${gig.venue.name}, ${dateLabel}`}
              aria-label={`Gig at ${gig.venue.name}, ${dateLabel}`}
              className="flex size-4 items-center justify-center rounded-full hover:bg-muted"
            >
              <span aria-hidden className="size-2 rounded-full bg-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniMonth({ monthDate, days }: { monthDate: Date; days: CalendarDay[] }) {
  const heading = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div>
      <h3 className="mb-2 text-center text-sm font-medium text-muted-foreground">{heading}</h3>
      <div className="overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-7 gap-px bg-border">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="bg-background py-1 text-center text-[10px] font-medium text-muted-foreground"
            >
              {label[0]}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border">
          {days.map((day) => (
            <DotCell key={day.date.toISOString()} day={day} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function QuarterStrip({
  anchorMonth,
  months,
}: {
  anchorMonth: Date
  months: { monthDate: Date; days: CalendarDay[] }[]
}) {
  const heading = formatQuarterHeading(anchorMonth)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href={quarterHref(addMonths(anchorMonth, -1))}
          aria-label="Previous month"
          className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-11')}
        >
          <ChevronLeftIcon />
        </Link>
        <h2 className="text-lg font-semibold">{heading}</h2>
        <Link
          href={quarterHref(addMonths(anchorMonth, 1))}
          aria-label="Next month"
          className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-11')}
        >
          <ChevronRightIcon />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {months.map((m) => (
          <MiniMonth key={m.monthDate.toISOString()} monthDate={m.monthDate} days={m.days} />
        ))}
      </div>
    </div>
  )
}
