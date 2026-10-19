import { notFound } from 'next/navigation'
import { getBandContext } from '@/lib/band'
import { getGigForPerformance } from '@/lib/services/gigs'
import { PerformanceView } from '@/components/gigs/performance-view'

export default async function PerformPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { bandId } = await getBandContext()
  const gig = await getGigForPerformance(bandId, id)
  if (!gig) notFound()

  return <PerformanceView gig={gig} />
}
