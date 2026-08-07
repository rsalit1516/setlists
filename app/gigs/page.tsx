import Link from 'next/link'
import { cookies } from 'next/headers'
import { getGigs, getGigsInRange, groupGigsByMonth } from '@/lib/services/gigs'
import { resolveGigsView, GIGS_VIEW_COOKIE } from '@/lib/gigs-view'
import { parseMonthParam, getMonthRange, buildMonthGrid } from '@/lib/gigs-month'
import { buttonVariants } from '@/components/ui/button'
import { ViewToggle } from '@/components/gigs/view-toggle'
import { CompactGigList } from '@/components/gigs/compact-gig-list'
import { MonthCalendar } from '@/components/gigs/month-calendar'

export default async function GigsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string }>
}) {
  const { view: viewParam, month: monthParam } = await searchParams
  const cookieStore = await cookies()
  const view = resolveGigsView(viewParam, cookieStore.get(GIGS_VIEW_COOKIE)?.value)

  let content: React.ReactNode
  if (view === 'month') {
    // Normalized to the 1st either way — parseMonthParam already returns a
    // first-of-month Date, the `new Date()` fallback doesn't.
    const rawMonth = parseMonthParam(monthParam) ?? new Date()
    const monthDate = new Date(rawMonth.getFullYear(), rawMonth.getMonth(), 1)
    const { start, end } = getMonthRange(monthDate)
    const monthGigs = await getGigsInRange(start, end)
    content = <MonthCalendar monthDate={monthDate} days={buildMonthGrid(monthDate, monthGigs)} />
  } else {
    const gigs = await getGigs()
    content =
      gigs.length === 0 ? (
        <p className="text-muted-foreground">No gigs yet.</p>
      ) : view === 'compact' ? (
        <CompactGigList monthGroups={groupGigsByMonth(gigs)} />
      ) : (
        <p className="text-muted-foreground">3-month strip view is coming soon.</p>
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
