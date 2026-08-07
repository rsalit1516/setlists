import Link from 'next/link'
import { cookies } from 'next/headers'
import { getGigs, groupGigsByMonth } from '@/lib/services/gigs'
import { resolveGigsView, GIGS_VIEW_COOKIE } from '@/lib/gigs-view'
import { buttonVariants } from '@/components/ui/button'
import { ViewToggle } from '@/components/gigs/view-toggle'
import { CompactGigList } from '@/components/gigs/compact-gig-list'

export default async function GigsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view: viewParam } = await searchParams
  const cookieStore = await cookies()
  const view = resolveGigsView(viewParam, cookieStore.get(GIGS_VIEW_COOKIE)?.value)

  const gigs = await getGigs()
  const monthGroups = groupGigsByMonth(gigs)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gigs</h1>
        <Link href="/gigs/new" className={buttonVariants({ size: 'sm' })}>
          New Gig
        </Link>
      </div>

      <ViewToggle current={view} />

      {gigs.length === 0 ? (
        <p className="text-muted-foreground">No gigs yet.</p>
      ) : view === 'compact' ? (
        <CompactGigList monthGroups={monthGroups} />
      ) : (
        <p className="text-muted-foreground">
          {view === 'month' ? 'Month' : 'Quarter'} view is coming soon.
        </p>
      )}
    </div>
  )
}
