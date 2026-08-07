import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { addMonths, formatMonthParam, type CalendarDay } from '@/lib/gigs-month'
import type { GigSummary } from '@/lib/types'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function monthHref(monthDate: Date) {
  return `/gigs?view=month&month=${formatMonthParam(monthDate)}`
}

function GigBlock({ gig }: { gig: GigSummary }) {
  const paid = gig.amountPaid ? parseFloat(gig.amountPaid) : null
  const contracted = gig.amountContracted ? parseFloat(gig.amountContracted) : null
  const amount = paid ?? contracted

  // Same paid/contracted distinction as Compact's PayStatus, rendered as a
  // filled chip instead of colored text since this is a block, not a row.
  const statusClasses =
    paid !== null
      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      : contracted !== null
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
        : 'bg-muted text-muted-foreground'

  return (
    <Link
      href={`/gigs/${gig.id}`}
      className={cn(
        'flex min-h-11 flex-col justify-center gap-0.5 rounded-sm px-1.5 py-1 text-left text-xs leading-tight transition-opacity hover:opacity-80',
        statusClasses
      )}
    >
      <span className="truncate font-medium">{gig.venue.name}</span>
      {amount !== null && <span className="truncate">${amount.toFixed(2)}</span>}
    </Link>
  )
}

function DayCell({ day }: { day: CalendarDay }) {
  return (
    <div
      className={cn(
        'flex min-h-11 flex-col gap-1 bg-background p-1.5 sm:min-h-24',
        !day.inCurrentMonth && 'bg-muted/30'
      )}
    >
      <span
        className={cn(
          'text-xs font-medium',
          day.inCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'
        )}
      >
        {day.date.getDate()}
      </span>
      {day.gigs.map((gig) => (
        <GigBlock key={gig.id} gig={gig} />
      ))}
    </div>
  )
}

export function MonthCalendar({ monthDate, days }: { monthDate: Date; days: CalendarDay[] }) {
  const heading = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href={monthHref(addMonths(monthDate, -1))}
          aria-label="Previous month"
          className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-11')}
        >
          <ChevronLeftIcon />
        </Link>
        <h2 className="text-lg font-semibold">{heading}</h2>
        <Link
          href={monthHref(addMonths(monthDate, 1))}
          aria-label="Next month"
          className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-11')}
        >
          <ChevronRightIcon />
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-7 gap-px bg-border">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="bg-background py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border">
          {days.map((day) => (
            <DayCell key={day.date.toISOString()} day={day} />
          ))}
        </div>
      </div>
    </div>
  )
}
