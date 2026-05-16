import Link from 'next/link'
import { getGigs } from '@/lib/services/gigs'
import { deleteGig } from './actions'
import { buttonVariants } from '@/components/ui/button'

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default async function GigsPage() {
  const gigs = await getGigs()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gigs</h1>
        <Link href="/gigs/new" className={buttonVariants({ size: 'sm' })}>
          New Gig
        </Link>
      </div>

      {gigs.length === 0 ? (
        <p className="text-muted-foreground">No gigs yet.</p>
      ) : (
        <div className="space-y-2">
          {gigs.map((gig) => {
            const deleteAction = deleteGig.bind(null, gig.id)
            return (
              <div key={gig.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/gigs/${gig.id}`} className="min-w-0 flex-1">
                    <div className="font-medium hover:underline">{formatDate(gig.date)}</div>
                    <div className="text-sm text-muted-foreground">{gig.venue.name}</div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right text-sm">
                      {gig.amountPaid ? (
                        <span className="text-green-600">
                          ${parseFloat(gig.amountPaid).toFixed(2)} paid
                        </span>
                      ) : gig.amountContracted ? (
                        <span className="text-amber-600">
                          ${parseFloat(gig.amountContracted).toFixed(2)} contracted
                        </span>
                      ) : null}
                    </div>
                    <form action={deleteAction}>
                      <button
                        type="submit"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete gig"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {gig.setlist.name} ·{' '}
                  {gig._count.musicians} musician{gig._count.musicians !== 1 ? 's' : ''}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
