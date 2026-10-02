import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompactGigList } from './compact-gig-list'
import type { GigSummary } from '@/lib/types'

vi.mock('@/app/gigs/actions', () => ({ deleteGig: vi.fn() }))

function makeGig(overrides: Partial<GigSummary> = {}): GigSummary {
  return {
    id: 'gig-1',
    date: new Date('2026-08-15T12:00:00'),
    notes: null,
    amountContracted: null,
    amountPaid: null,
    paidAt: null,
    tips: null,
    otherRevenue: null,
    venue: { name: 'The Jazz Club' },
    setlist: { name: 'The Jazz Club - 08-15-26' },
    setlistCreator: null,
    _count: { musicians: 4 },
    ...overrides,
  }
}

function renderList(gig: GigSummary) {
  render(
    <CompactGigList
      monthGroups={[{ key: '2026-08', label: 'August 2026', gigs: [gig], defaultExpanded: true }]}
    />
  )
}

describe('CompactGigList — setlist creator', () => {
  it("shows who's responsible for the setlist", () => {
    renderList(makeGig({ setlistCreator: { name: 'Jeff Zbar' } }))

    // Mobile and sm+ layouts are both in the DOM; CSS picks one.
    expect(screen.getAllByText('Setlist: Jeff Zbar')).toHaveLength(2)
  })

  it('shows nothing when no setlist creator is set', () => {
    renderList(makeGig())

    expect(screen.queryByText(/Setlist:/)).not.toBeInTheDocument()
  })
})
