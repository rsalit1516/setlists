import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav } from './nav'

let mockPathname = '/gigs'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

describe('Nav', () => {
  beforeEach(() => {
    mockPathname = '/gigs'
  })

  it('renders top-level links in order, with Directory last as a dropdown trigger', () => {
    render(<Nav />)
    const nav = within(screen.getByRole('navigation', { name: 'Main' }))

    expect(nav.getAllByRole('link').map((el) => el.textContent)).toEqual([
      'Gigs',
      'Setlists',
      'Songs',
      'Finance',
      'Stats',
    ])
    expect(nav.getByRole('button', { name: /Directory/ })).toBeInTheDocument()
  })

  it('opens the Directory dropdown on click and shows Venues and Musicians', async () => {
    const user = userEvent.setup()
    render(<Nav />)
    const nav = within(screen.getByRole('navigation', { name: 'Main' }))

    expect(screen.queryByRole('menuitem', { name: 'Venues' })).not.toBeInTheDocument()

    await user.click(nav.getByRole('button', { name: /Directory/ }))

    expect(await screen.findByRole('menuitem', { name: 'Venues' })).toHaveAttribute(
      'href',
      '/venues'
    )
    expect(screen.getByRole('menuitem', { name: 'Musicians' })).toHaveAttribute(
      'href',
      '/musicians'
    )
  })

  it('highlights the active top-level link and leaves others unhighlighted', () => {
    mockPathname = '/songs'
    render(<Nav />)
    const nav = within(screen.getByRole('navigation', { name: 'Main' }))

    expect(nav.getByRole('link', { name: 'Songs' })).toHaveClass('font-bold')
    expect(nav.getByRole('link', { name: 'Gigs' })).not.toHaveClass('font-bold')
  })

  it('highlights the Directory trigger when on a grouped child route', () => {
    mockPathname = '/venues'
    render(<Nav />)
    const nav = within(screen.getByRole('navigation', { name: 'Main' }))

    expect(nav.getByRole('button', { name: /Directory/ })).toHaveClass('font-bold')
  })

  it('does not highlight the Directory trigger on unrelated routes', () => {
    mockPathname = '/gigs'
    render(<Nav />)
    const nav = within(screen.getByRole('navigation', { name: 'Main' }))

    expect(nav.getByRole('button', { name: /Directory/ })).not.toHaveClass('font-bold')
  })

  it('mobile menu shows Venues and Musicians always-expanded under a Directory heading', async () => {
    const user = userEvent.setup()
    render(<Nav />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    const mobileNav = within(screen.getByRole('navigation', { name: 'Mobile' }))

    expect(mobileNav.getByText('Directory')).toBeInTheDocument()
    expect(mobileNav.getByRole('link', { name: 'Venues' })).toHaveAttribute('href', '/venues')
    expect(mobileNav.getByRole('link', { name: 'Musicians' })).toHaveAttribute(
      'href',
      '/musicians'
    )
  })

  it('closes the mobile menu when a link is clicked', async () => {
    const user = userEvent.setup()
    render(<Nav />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(within(screen.getByRole('navigation', { name: 'Mobile' })).getByRole('link', { name: 'Venues' }))

    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument()
  })
})
