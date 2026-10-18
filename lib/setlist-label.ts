import type { SetlistSummary } from '@/lib/types'

function formatSetlistGigDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatSetlistLabel(sl: SetlistSummary): string {
  return `${sl.name} — ${sl._count.items} song${sl._count.items !== 1 ? 's' : ''}${sl.gig ? ` · ${sl.gig.venue.name}, ${formatSetlistGigDate(sl.gig.date)}` : ''}`
}
