import Link from 'next/link'
import { deleteGig } from '@/app/gigs/actions'
import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button'
import { MonthSection } from '@/components/gigs/month-section'
import { cn } from '@/lib/utils'
import type { GigMonthGroup, GigSummary } from '@/lib/types'

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function PayStatus({ gig, className }: { gig: GigSummary; className?: string }) {
  if (gig.amountPaid) {
    return (
      <span className={cn('whitespace-nowrap text-green-600', className)}>
        ${parseFloat(gig.amountPaid).toFixed(2)} paid
      </span>
    )
  }
  if (gig.amountContracted) {
    return (
      <span className={cn('whitespace-nowrap text-amber-600', className)}>
        ${parseFloat(gig.amountContracted).toFixed(2)} contracted
      </span>
    )
  }
  return null
}

function CompactGigRow({ gig }: { gig: GigSummary }) {
  const deleteAction = deleteGig.bind(null, gig.id)
  const headcount = `${gig._count.musicians} musician${gig._count.musicians !== 1 ? 's' : ''}`

  return (
    <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
      <Link href={`/gigs/${gig.id}`} className="min-w-0 flex-1">
        {/* Below sm: 2-line stack — date + pay status, then venue + headcount */}
        <div className="flex items-baseline justify-between gap-3 sm:hidden">
          <span className="font-medium">{formatDate(gig.date)}</span>
          <PayStatus gig={gig} className="text-sm" />
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3 sm:hidden">
          <span className="truncate text-sm text-muted-foreground">{gig.venue.name}</span>
          <span className="shrink-0 text-sm text-muted-foreground">{headcount}</span>
        </div>

        {/* sm and up: single-line grid */}
        <div className="hidden sm:grid sm:grid-cols-[8rem_1fr_7rem_9rem] sm:items-center sm:gap-4">
          <span className="font-medium">{formatDate(gig.date)}</span>
          <span className="truncate text-muted-foreground">{gig.venue.name}</span>
          <span className="text-muted-foreground">{headcount}</span>
          <PayStatus gig={gig} className="text-right text-sm" />
        </div>
      </Link>
      <DeleteConfirmButton
        action={deleteAction}
        variant="icon"
        ariaLabel="Delete gig"
        description={`Remove the gig at ${gig.venue.name} on ${formatDate(gig.date)}?`}
      />
    </div>
  )
}

export function CompactGigList({ monthGroups }: { monthGroups: GigMonthGroup[] }) {
  return (
    <div className="space-y-4">
      {monthGroups.map((group) => (
        <MonthSection
          key={group.key}
          monthKey={group.key}
          label={group.label}
          count={group.gigs.length}
          defaultExpanded={group.defaultExpanded}
        >
          {group.gigs.map((gig) => (
            <CompactGigRow key={gig.id} gig={gig} />
          ))}
        </MonthSection>
      ))}
    </div>
  )
}
