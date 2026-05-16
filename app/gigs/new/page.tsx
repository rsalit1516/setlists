import { getVenues } from '@/lib/services/venues'
import { getSetlists } from '@/lib/services/setlists'
import { GigForm } from '@/components/gigs/gig-form'

export default async function NewGigPage({
  searchParams,
}: {
  searchParams: Promise<{ setlistId?: string }>
}) {
  const { setlistId } = await searchParams
  const [venues, allSetlists] = await Promise.all([getVenues(), getSetlists()])
  const setlists = allSetlists.filter((s) => !s.gig)

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">New Gig</h1>
      <GigForm venues={venues} setlists={setlists} defaultSetlistId={setlistId} />
    </div>
  )
}
