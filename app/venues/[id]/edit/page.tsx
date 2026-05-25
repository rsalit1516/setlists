import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getVenue } from '@/lib/services/venues'
import { VenueForm } from '@/components/venues/venue-form'
import { updateVenue } from '../../actions'
import { requireBandId } from '@/lib/auth-helpers'

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const bandId = await requireBandId()
  const venue = await getVenue(id, bandId)

  if (!venue) notFound()

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-6">
        <Link href="/venues" className="text-sm text-muted-foreground hover:underline">
          ← Venues
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Edit Venue</h1>
      </div>
      <VenueForm venue={venue} action={updateVenue} />
    </div>
  )
}
