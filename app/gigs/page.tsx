import Link from 'next/link'
import { cookies } from 'next/headers'
import { getGigs, getGigsInRange, hasAnyGigs, groupGigsByMonth } from '@/lib/services/gigs'
import { resolveGigsView, GIGS_VIEW_COOKIE } from '@/lib/gigs-view'
import { parseMonthParam, getMonthRange, buildMonthGrid } from '@/lib/gigs-month'
import { getQuarterMonths, getQuarterRange } from '@/lib/gigs-quarter'
import { buttonVariants } from '@/components/ui/button'
import { ViewToggle } from '@/components/gigs/view-toggle'
import { CompactGigList } from '@/components/gigs/compact-gig-list'
import { MonthCalendar } from '@/components/gigs/month-calendar'
import { QuarterStrip } from '@/components/gigs/quarter-strip'

export default async function GigsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; quarter?: string }>
}) {
  const { view: viewParam, month: monthParam, quarter: quarterParam } = await searchParams
  const cookieStore = await cookies()
  const view = resolveGigsView(viewParam, cookieStore.get(GIGS_VIEW_COOKIE)?.value)

  let content: React.ReactNode
  if (view === 'month') {
    // Normalized to the 1st either way — parseMonthParam already returns a
    // first-of-month Date, the `new Date()` fallback doesn't.
    const rawMonth = parseMonthParam(monthParam) ?? new Date()
    const monthDate = new Date(rawMonth.getFullYear(), rawMonth.getMonth(), 1)
    const { start, end } = getMonthRange(monthDate)
    // Fetched together: monthGigs is scoped to the visible month (the AC), while
    // anyGigs is a cheap count — not a full-history fetch — just to tell "no gigs
    // booked this month" apart from "this app has zero gigs, ever" for the empty state.
    const [monthGigs, anyGigs] = await Promise.all([getGigsInRange(start, end), hasAnyGigs()])
    content = anyGigs ? (
      <MonthCalendar monthDate={monthDate} days={buildMonthGrid(monthDate, monthGigs)} />
    ) : (
      <p className="text-muted-foreground">No gigs yet.</p>
    )
  } else if (view === 'quarter') {
    // Same first-of-month normalization as Month; defaults to this month so
    // the strip opens on "this month + next 2" with no `?quarter=` param.
    const rawAnchor = parseMonthParam(quarterParam) ?? new Date()
    const anchorMonth = new Date(rawAnchor.getFullYear(), rawAnchor.getMonth(), 1)
    const { start, end } = getQuarterRange(anchorMonth)
    // One getGigsInRange call spans all three months; each mini-calendar is
    // then built from its own slice rather than the full quarterGigs list —
    // buildMonthGrid does a linear scan per day cell, so handing it the whole
    // quarter would triple that scan for no benefit.
    const [quarterGigs, anyGigs] = await Promise.all([getGigsInRange(start, end), hasAnyGigs()])
    const months = getQuarterMonths(anchorMonth).map((monthDate) => {
      const monthRange = getMonthRange(monthDate)
      const monthGigs = quarterGigs.filter((g) => g.date >= monthRange.start && g.date < monthRange.end)
      return { monthDate, days: buildMonthGrid(monthDate, monthGigs) }
    })
    content = anyGigs ? (
      <QuarterStrip anchorMonth={anchorMonth} months={months} />
    ) : (
      <p className="text-muted-foreground">No gigs yet.</p>
    )
  } else {
    const gigs = await getGigs()
    content =
      gigs.length === 0 ? (
        <p className="text-muted-foreground">No gigs yet.</p>
      ) : (
        <CompactGigList monthGroups={groupGigsByMonth(gigs)} />
      )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gigs</h1>
        <Link href="/gigs/new" className={buttonVariants({ size: 'sm' })}>
          New Gig
        </Link>
      </div>

      <ViewToggle current={view} />

      {content}
    </div>
  )
}
