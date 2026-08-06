import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonthSection } from './month-section'

beforeEach(() => window.localStorage.clear())

describe('MonthSection', () => {
  it('renders children expanded when defaultExpanded is true', () => {
    render(
      <MonthSection monthKey="2026-08" label="August 2026" count={1} defaultExpanded={true}>
        <div>Gig content</div>
      </MonthSection>
    )
    expect(screen.getByRole('button', { name: /August 2026/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Gig content')).toBeInTheDocument()
  })

  it('hides children when defaultExpanded is false', () => {
    render(
      <MonthSection monthKey="2026-07" label="July 2026" count={1} defaultExpanded={false}>
        <div>Gig content</div>
      </MonthSection>
    )
    expect(screen.getByRole('button', { name: /July 2026/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Gig content')).not.toBeInTheDocument()
  })

  it('toggles expanded state on click', () => {
    render(
      <MonthSection monthKey="2026-07" label="July 2026" count={1} defaultExpanded={false}>
        <div>Gig content</div>
      </MonthSection>
    )
    fireEvent.click(screen.getByRole('button', { name: /July 2026/ }))
    expect(screen.getByText('Gig content')).toBeInTheDocument()
  })

  it('persists a manual toggle to localStorage', () => {
    render(
      <MonthSection monthKey="2026-07" label="July 2026" count={1} defaultExpanded={false}>
        <div>Gig content</div>
      </MonthSection>
    )
    fireEvent.click(screen.getByRole('button', { name: /July 2026/ }))
    expect(window.localStorage.getItem('gigs:monthOpen:2026-07')).toBe('true')
  })

  it('overrides the date-based default with a stored preference on mount', () => {
    window.localStorage.setItem('gigs:monthOpen:2026-07', 'true')
    render(
      <MonthSection monthKey="2026-07" label="July 2026" count={1} defaultExpanded={false}>
        <div>Gig content</div>
      </MonthSection>
    )
    expect(screen.getByRole('button', { name: /July 2026/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Gig content')).toBeInTheDocument()
  })
})
