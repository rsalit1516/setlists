import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/app/gigs/actions', () => ({ copySetlistToGig: vi.fn() }))

import { copySetlistToGig } from '@/app/gigs/actions'
import { CopySetlistDialog } from './copy-setlist-dialog'
import type { SetlistSummary } from '@/lib/types'

const sources: SetlistSummary[] = [
  {
    id: 'sl-1',
    name: 'Summer Set',
    createdAt: new Date('2026-06-01'),
    gig: { id: 'g-1', date: new Date('2026-06-20T12:00:00'), venue: { name: 'The Roxy' } },
    _count: { items: 12 },
  },
  {
    id: 'sl-2',
    name: 'Acoustic',
    createdAt: new Date('2026-07-01'),
    gig: null,
    _count: { items: 1 },
  },
]

beforeEach(() => {
  vi.mocked(copySetlistToGig).mockReset()
  vi.mocked(copySetlistToGig).mockResolvedValue(null)
})

describe('CopySetlistDialog', () => {
  it('warns about replacement and labels the confirm button "Replace setlist" when the gig has songs', async () => {
    const user = userEvent.setup()
    render(<CopySetlistDialog gigId="gig-1" sources={sources} existingSongCount={5} />)

    await user.click(screen.getByRole('button', { name: 'Copy Setlist' }))

    expect(screen.getByText('This will replace 5 songs currently on this setlist.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace setlist' })).toBeInTheDocument()
  })

  it('shows no warning and a plain "Copy" button when the gig is empty', async () => {
    const user = userEvent.setup()
    render(<CopySetlistDialog gigId="gig-1" sources={sources} existingSongCount={0} />)

    await user.click(screen.getByRole('button', { name: 'Copy Setlist' }))

    expect(screen.queryByText(/This will replace/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Replace setlist' })).not.toBeInTheDocument()
  })

  it('uses the singular for a one-song replacement', async () => {
    const user = userEvent.setup()
    render(<CopySetlistDialog gigId="gig-1" sources={sources} existingSongCount={1} />)

    await user.click(screen.getByRole('button', { name: 'Copy Setlist' }))

    expect(screen.getByText('This will replace 1 song currently on this setlist.')).toBeInTheDocument()
  })

  it('lists sources with song count and source gig, and disables confirm until one is chosen', async () => {
    const user = userEvent.setup()
    render(<CopySetlistDialog gigId="gig-1" sources={sources} existingSongCount={0} />)

    await user.click(screen.getByRole('button', { name: 'Copy Setlist' }))

    expect(screen.getByLabelText(/Summer Set — 12 songs · The Roxy, Jun 20, 2026/)).toBeInTheDocument()
    expect(screen.getByLabelText('Acoustic — 1 song')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
  })

  it('copies the chosen setlist onto the gig and closes the dialog', async () => {
    const user = userEvent.setup()
    render(<CopySetlistDialog gigId="gig-1" sources={sources} existingSongCount={3} />)

    await user.click(screen.getByRole('button', { name: 'Copy Setlist' }))
    await user.click(screen.getByLabelText(/Summer Set/))
    await user.click(screen.getByRole('button', { name: 'Replace setlist' }))

    expect(copySetlistToGig).toHaveBeenCalledWith('gig-1', 'sl-1')
    await waitFor(() => expect(screen.queryByText('Copy a setlist')).not.toBeInTheDocument())
  })

  it('keeps the dialog open and shows the error when the action fails', async () => {
    vi.mocked(copySetlistToGig).mockResolvedValue({ error: 'Source setlist has no songs.' })
    const user = userEvent.setup()
    render(<CopySetlistDialog gigId="gig-1" sources={sources} existingSongCount={0} />)

    await user.click(screen.getByRole('button', { name: 'Copy Setlist' }))
    await user.click(screen.getByLabelText(/Acoustic/))
    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Source setlist has no songs.')
    expect(screen.getByText('Copy a setlist')).toBeInTheDocument()
  })

  it('says so when there is nothing to copy from', async () => {
    const user = userEvent.setup()
    render(<CopySetlistDialog gigId="gig-1" sources={[]} existingSongCount={0} />)

    await user.click(screen.getByRole('button', { name: 'Copy Setlist' }))

    expect(screen.getByText('No other setlists with songs to copy.')).toBeInTheDocument()
  })
})
