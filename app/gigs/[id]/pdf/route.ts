import { renderToBuffer } from '@react-pdf/renderer'
import { getGig } from '@/lib/services/gigs'
import { buildPrintLayout } from '@/lib/setlist-print'
import { GigSetlistPdf } from '@/lib/pdf/gig-setlist-pdf'

export const runtime = 'nodejs'

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const gig = await getGig(id)
  if (!gig) {
    return new Response('Not found', { status: 404 })
  }

  const layout = buildPrintLayout(gig.setlist.items)
  const buffer = await renderToBuffer(
    GigSetlistPdf({
      venueName: gig.venue.name,
      date: formatDate(gig.date),
      layout,
    }),
  )

  const fileSafeVenue = gig.venue.name.replace(/[^a-z0-9]+/gi, '-')
  const fileSafeDate = new Date(gig.date).toISOString().slice(0, 10)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileSafeVenue}-${fileSafeDate}-setlist.pdf"`,
    },
  })
}
