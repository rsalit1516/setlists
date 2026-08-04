import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getGig } from '@/lib/services/gigs'
import { getVenues } from '@/lib/services/venues'
import { GigForm } from '@/components/gigs/gig-form'
import { updateGig } from '@/app/gigs/actions'

export default async function EditGigPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [gig, venues] = await Promise.all([getGig(id), getVenues()])

  if (!gig) notFound()

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <Link href={`/gigs/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← Gig
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Edit Gig</h1>
      </div>
      <GigForm venues={venues} gig={gig} action={updateGig} />
    </div>
  )
}
