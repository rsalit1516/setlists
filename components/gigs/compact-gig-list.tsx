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
      <span className={cn('whitespace-nowrap text-green-600 dark:text-green-400', className)}>
        ${parseFloat(gig.amountPaid).toFixed(2)} Paid
      </span>
    )
  }
  if (gig.amountContracted) {
    return (
      <span className={cn('whitespace-nowrap text-red-600 dark:text-red-400', className)}>
        ${parseFloat(gig.amountContracted).toFixed(2)} Contracted
      </span>
    )
  }
  return null
}

function CompactGigRow({ gig }: { gig: GigSummary }) {
  const deleteAction = deleteGig.bind(null, gig.id)
  const headcount = `${gig._count.musicians} musician${gig._count.musicians !== 1 ? 's' : ''}`

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/40">
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

        {/* sm and up: single line — date/venue fill the left, headcount and
            pay status sit in fixed-width right-aligned columns */}
        <div className="hidden sm:flex sm:items-center sm:gap-4">
          <span className="w-32 shrink-0 font-medium">{formatDate(gig.date)}</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{gig.venue.name}</span>
          <span className="w-28 shrink-0 text-right text-sm text-muted-foreground">{headcount}</span>
          <PayStatus gig={gig} className="w-40 shrink-0 text-right text-sm" />
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
