import { getVenues } from '@/lib/services/venues'
import { GigForm } from '@/components/gigs/gig-form'
import { requireBandId } from '@/lib/auth-helpers'

export default async function NewGigPage({
  searchParams,
}: {
  searchParams: Promise<{ setlistId?: string }>
}) {
  const { setlistId } = await searchParams
  const bandId = await requireBandId()
  const venues = await getVenues(bandId)

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">New Gig</h1>
      <GigForm venues={venues} defaultSetlistId={setlistId} />
    </div>
  )
}
