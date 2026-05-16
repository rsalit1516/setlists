import Link from 'next/link'
import { getVenues } from '@/lib/services/venues'
import { Button, buttonVariants } from '@/components/ui/button'
import { deleteVenue } from './actions'

export default async function VenuesPage() {
  const venues = await getVenues()

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Venues</h1>
        <Link href="/venues/new" className={buttonVariants()}>
          + Add Venue
        </Link>
      </div>

      {venues.length === 0 ? (
        <p className="text-muted-foreground">No venues yet. Add your first one!</p>
      ) : (
        <ul className="space-y-3">
          {venues.map((venue) => {
            const deleteAction = deleteVenue.bind(null, venue.id)
            return (
              <li key={venue.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <div className="min-w-0">
                  <p className="font-medium">{venue.name}</p>
                  {venue.address && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{venue.address}</p>
                  )}
                  {venue.notes && (
                    <p className="mt-1 text-sm text-muted-foreground">{venue.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/venues/${venue.id}/edit`}
                    className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  >
                    Edit
                  </Link>
                  <form action={deleteAction}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </form>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
