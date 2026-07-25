import { notFound } from 'next/navigation'
import { getGigForPerformance } from '@/lib/services/gigs'
import { PerformanceView } from '@/components/gigs/performance-view'

export default async function PerformPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const gig = await getGigForPerformance(id)
  if (!gig) notFound()

  return <PerformanceView gig={gig} />
}
