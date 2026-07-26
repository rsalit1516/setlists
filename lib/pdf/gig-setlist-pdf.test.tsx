import { describe, it, expect } from 'vitest'
import { GigSetlistPdf } from './gig-setlist-pdf'
import type { PrintLayout } from '@/lib/setlist-print'

const emptyLayout: PrintLayout = { soundcheck: [], encore: [], columns: [] }

// Regression guard for https://github.com/rsalit1516/setlists/issues/4 —
// the "Download PDF" path must stay landscape independent of the browser's
// print-preview @page handling, which some browsers/drivers ignore.
describe('GigSetlistPdf', () => {
  it('renders the PDF page in landscape orientation', () => {
    const document = GigSetlistPdf({
      venueName: 'The Jazz Club',
      date: 'Friday, May 15, 2026',
      layout: emptyLayout,
    })
    const page = document.props.children
    expect(page.props.orientation).toBe('landscape')
  })
})
