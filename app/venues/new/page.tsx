import Link from 'next/link'
import { VenueForm } from '@/components/venues/venue-form'
import { createVenue } from '../actions'

export default function NewVenuePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-6">
        <Link href="/venues" className="text-sm text-muted-foreground hover:underline">
          ← Venues
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add Venue</h1>
      </div>
      <VenueForm action={createVenue} />
    </div>
  )
}
