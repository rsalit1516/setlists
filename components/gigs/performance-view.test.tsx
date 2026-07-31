import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PerformanceView } from './performance-view'
import type { GigPerformanceData } from '@/lib/types'

const gig: GigPerformanceData = {
  id: 'gig-1',
  date: new Date('2026-07-01'),
  venue: { name: 'The Fillmore' },
  items: [
    {
      id: 'item-1',
      order: 0,
      section: 'MAIN',
      setNumber: 1,
      song: {
        title: 'Friend of the Devil',
        key: 'G',
        // Mirrors what getGigForPerformance actually hands this component:
        // already-sanitized HTML (see lib/services/gigs.ts), one <p> per line.
        lyrics: '<p>She\'s got a "cheap sunglasses" line</p><p>And a second line, don\'t stop</p>',
        chartFileUrl: null,
        chartFileType: null,
      },
    },
    {
      id: 'item-2',
      order: 1,
      section: 'MAIN',
      setNumber: 1,
      song: {
        title: 'Bertha',
        key: 'A',
        lyrics: null,
        chartFileUrl: 'https://blob.example.com/charts/bertha.pdf',
        chartFileType: 'application/pdf',
      },
    },
  ],
}

beforeEach(() => {
  vi.stubGlobal('navigator', {
    ...navigator,
    serviceWorker: { register: vi.fn().mockResolvedValue(undefined) },
  })
  vi.stubGlobal('caches', {
    open: vi.fn().mockResolvedValue({
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    }),
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, clone: () => ({}) }))
})

describe('PerformanceView', () => {
  it('runs the offline pre-flight cache pass, then renders the first song lyrics with quotes and line breaks preserved', async () => {
    render(<PerformanceView gig={gig} />)
    expect(await screen.findByText('Friend of the Devil')).toBeInTheDocument()
    expect(screen.getByText(/cheap sunglasses/)).toBeInTheDocument()
    expect(screen.getByText(/don't stop/)).toBeInTheDocument()
  })

  it('renders sanitized lyrics HTML as real markup, not escaped text', async () => {
    const { container } = render(<PerformanceView gig={gig} />)
    await screen.findByText('Friend of the Devil')
    const paragraphs = container.querySelectorAll('.rich-text-content p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0].textContent).toContain('cheap sunglasses')
    expect(paragraphs[1].textContent).toContain("don't stop")
  })

  it('disables Prev on the first song and advances to the next song on Next', async () => {
    render(<PerformanceView gig={gig} />)
    await screen.findByText('Friend of the Devil')

    const prevButtons = screen.getAllByText('◀ Prev')
    expect(prevButtons[0]).toBeDisabled()

    fireEvent.click(screen.getAllByText('Next ▶')[0])

    expect(screen.getByText('Bertha')).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('switches to the chart view automatically when a song has no lyrics', async () => {
    render(<PerformanceView gig={gig} />)
    await screen.findByText('Friend of the Devil')

    fireEvent.click(screen.getAllByText('Next ▶')[0])
    const iframe = screen.getByTitle('Bertha')
    expect(iframe).toHaveAttribute('src', 'https://blob.example.com/charts/bertha.pdf')
  })

  it('toggles between lyrics and chart when both are available', async () => {
    const gigWithBoth: GigPerformanceData = {
      ...gig,
      items: [
        {
          ...gig.items[0],
          song: {
            ...gig.items[0].song,
            chartFileUrl: 'https://blob.example.com/charts/fotd.png',
            chartFileType: 'image/png',
          },
        },
      ],
    }
    render(<PerformanceView gig={gigWithBoth} />)
    expect(await screen.findByText(/cheap sunglasses/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Chart'))
    expect(screen.getByAltText('Friend of the Devil')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Lyrics'))
    expect(screen.getByText(/cheap sunglasses/)).toBeInTheDocument()
  })

  it('shows an empty-state message when the setlist has no songs', () => {
    render(<PerformanceView gig={{ ...gig, items: [] }} />)
    expect(screen.getByText('This setlist has no songs yet.')).toBeInTheDocument()
  })
})
