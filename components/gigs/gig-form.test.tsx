import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GigForm } from './gig-form'
import type { GigWithDetails, SetlistSummary, Venue } from '@/lib/types'

vi.mock('../../lib/db', () => ({ default: {} }))

const mockVenues: Venue[] = [
  { id: 'v-1', name: 'The Jazz Club', address: null, notes: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
]

function makeSetlist(overrides: Partial<SetlistSummary> = {}): SetlistSummary {
  return {
    id: 'sl-1',
    name: 'Friday Night',
    createdAt: new Date('2026-05-01'),
    gig: null,
    _count: { items: 5 },
    ...overrides,
  }
}

const noopAction = vi.fn().mockResolvedValue(null)

describe('GigForm — setlist picker', () => {
  it('defaults to "create new setlist" and submits createSetlist=true with no setlist dropdown', () => {
    render(<GigForm venues={mockVenues} setlists={[makeSetlist()]} action={noopAction} />)

    expect(screen.getByLabelText('Create new setlist')).toBeChecked()
    expect(screen.queryByTitle('Setlist')).not.toBeInTheDocument()

    const form = screen.getByRole('button', { name: 'Create Gig' }).closest('form')!
    const hidden = form.querySelector('input[name="createSetlist"]') as HTMLInputElement
    expect(hidden.value).toBe('true')
  })

  it('shows the existing-setlist dropdown, with song count and source gig, after choosing "copy"', () => {
    const setlists = [
      makeSetlist({ id: 'sl-1', name: 'Friday Night', _count: { items: 12 }, gig: null }),
      makeSetlist({
        id: 'sl-2',
        name: 'Greatest Hits',
        _count: { items: 8 },
        gig: { id: 'g-1', date: new Date('2026-05-01T12:00:00'), venue: { name: 'The Jazz Club' } },
      }),
    ]
    render(<GigForm venues={mockVenues} setlists={setlists} action={noopAction} />)

    fireEvent.click(screen.getByLabelText('Copy an existing setlist'))

    const select = screen.getByTitle('Setlist') as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.text)
    expect(options).toContain('Friday Night — 12 songs')
    expect(options).toContain('Greatest Hits — 8 songs · The Jazz Club, May 1, 2026')
  })

  it('pre-selects copy mode and the given setlist when defaultSetlistId is provided', () => {
    const setlists = [makeSetlist({ id: 'sl-1' }), makeSetlist({ id: 'sl-2', name: 'Other Setlist' })]
    render(
      <GigForm venues={mockVenues} setlists={setlists} action={noopAction} defaultSetlistId="sl-2" />
    )

    expect(screen.getByLabelText('Copy an existing setlist')).toBeChecked()
    expect((screen.getByTitle('Setlist') as HTMLSelectElement).value).toBe('sl-2')
  })

  it('switching back to "create new" hides the dropdown and reverts to createSetlist=true', () => {
    render(<GigForm venues={mockVenues} setlists={[makeSetlist()]} action={noopAction} />)

    fireEvent.click(screen.getByLabelText('Copy an existing setlist'))
    expect(screen.getByTitle('Setlist')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Create new setlist'))
    expect(screen.queryByTitle('Setlist')).not.toBeInTheDocument()
    const form = screen.getByRole('button', { name: 'Create Gig' }).closest('form')!
    expect((form.querySelector('input[name="createSetlist"]') as HTMLInputElement).value).toBe('true')
  })

  it('skips the mode picker and always creates a new setlist when none exist yet', () => {
    render(<GigForm venues={mockVenues} setlists={[]} action={noopAction} />)

    expect(screen.queryByLabelText('Create new setlist')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Copy an existing setlist')).not.toBeInTheDocument()
    expect(screen.getByText('A new setlist will be created for this gig.')).toBeInTheDocument()
    const form = screen.getByRole('button', { name: 'Create Gig' }).closest('form')!
    expect((form.querySelector('input[name="createSetlist"]') as HTMLInputElement).value).toBe('true')
  })

  it('omits the setlist picker entirely when editing an existing gig', () => {
    const gig: GigWithDetails = {
      id: 'gig-1',
      date: new Date('2026-05-01'),
      startTime: null,
      endTime: null,
      notes: null,
      amountContracted: null,
      amountPaid: null,
      paidAt: null,
      tips: null,
      otherRevenue: null,
      venueId: 'v-1',
      setlistId: 'sl-1',
      venue: mockVenues[0],
      setlist: { id: 'sl-1', name: 'Friday Night', items: [] },
      expenses: [],
      musicians: [],
      createdAt: new Date('2026-05-01'),
      updatedAt: new Date('2026-05-01'),
    }
    render(<GigForm venues={mockVenues} setlists={[makeSetlist()]} gig={gig} action={noopAction} />)

    expect(screen.queryByText('Setlist')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Create new setlist')).not.toBeInTheDocument()
  })
})

describe('GigForm — financials fields', () => {
  it('renders Paid by venue, Paid on, Tips, and Other revenue as empty editable fields when creating a new gig', () => {
    render(<GigForm venues={mockVenues} setlists={[]} action={noopAction} />)

    const form = screen.getByRole('button', { name: 'Create Gig' }).closest('form')!
    expect((form.querySelector('input[name="amountPaid"]') as HTMLInputElement).value).toBe('')
    expect((form.querySelector('input[name="paidAt"]') as HTMLInputElement).value).toBe('')
    expect((form.querySelector('input[name="tips"]') as HTMLInputElement).value).toBe('')
    expect((form.querySelector('input[name="otherRevenue"]') as HTMLInputElement).value).toBe('')
  })

  it("pre-fills financials fields with the gig's existing values when editing", () => {
    const gig: GigWithDetails = {
      id: 'gig-1',
      date: new Date('2026-05-01'),
      startTime: null,
      endTime: null,
      notes: null,
      amountContracted: '500',
      amountPaid: '250',
      paidAt: new Date('2026-08-16T12:00:00'),
      tips: '40',
      otherRevenue: '15',
      venueId: 'v-1',
      setlistId: 'sl-1',
      venue: mockVenues[0],
      setlist: { id: 'sl-1', name: 'Friday Night', items: [] },
      expenses: [],
      musicians: [],
      createdAt: new Date('2026-05-01'),
      updatedAt: new Date('2026-05-01'),
    }
    render(<GigForm venues={mockVenues} setlists={[]} gig={gig} action={noopAction} />)

    const form = screen.getByRole('button', { name: 'Save Changes' }).closest('form')!
    expect((form.querySelector('input[name="amountPaid"]') as HTMLInputElement).value).toBe('250')
    expect((form.querySelector('input[name="paidAt"]') as HTMLInputElement).value).toBe('2026-08-16')
    expect((form.querySelector('input[name="tips"]') as HTMLInputElement).value).toBe('40')
    expect((form.querySelector('input[name="otherRevenue"]') as HTMLInputElement).value).toBe('15')
  })

  it('leaves Paid on blank when the gig has no recorded payment date', () => {
    const gig: GigWithDetails = {
      id: 'gig-1',
      date: new Date('2026-05-01'),
      startTime: null,
      endTime: null,
      notes: null,
      amountContracted: null,
      amountPaid: null,
      paidAt: null,
      tips: null,
      otherRevenue: null,
      venueId: 'v-1',
      setlistId: 'sl-1',
      venue: mockVenues[0],
      setlist: { id: 'sl-1', name: 'Friday Night', items: [] },
      expenses: [],
      musicians: [],
      createdAt: new Date('2026-05-01'),
      updatedAt: new Date('2026-05-01'),
    }
    render(<GigForm venues={mockVenues} setlists={[]} gig={gig} action={noopAction} />)

    const form = screen.getByRole('button', { name: 'Save Changes' }).closest('form')!
    expect((form.querySelector('input[name="paidAt"]') as HTMLInputElement).value).toBe('')
  })
})
