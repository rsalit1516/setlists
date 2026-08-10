import { getVenues } from '@/lib/services/venues'
import { getSetlists } from '@/lib/services/setlists'
import { getMusicians } from '@/lib/services/musicians'
import { GigForm } from '@/components/gigs/gig-form'
import { createGig } from '@/app/gigs/actions'

export default async function NewGigPage({
  searchParams,
}: {
  searchParams: Promise<{ setlistId?: string }>
}) {
  const { setlistId } = await searchParams
  const [venues, setlists, musicians] = await Promise.all([getVenues(), getSetlists(), getMusicians()])

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">New Gig</h1>
      <GigForm
        venues={venues}
        setlists={setlists}
        musicians={musicians}
        action={createGig}
        defaultSetlistId={setlistId}
      />
    </div>
  )
}
