import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/app/songs/actions', () => ({ addSongToCatalog: vi.fn() }))

import { CatalogMatchList } from './catalog-match-list'
import type { CatalogMatch } from '@/lib/services/songs'

function match(overrides: Partial<CatalogMatch> = {}): CatalogMatch {
  return {
    songId: 'song-1',
    title: "Don't Stop Believin'",
    artist: 'Journey',
    isMaster: true,
    bandSongId: null,
    removed: false,
    score: 1,
    ...overrides,
  }
}

describe('CatalogMatchList', () => {
  it('offers to add a shared song the band does not have yet', () => {
    render(<CatalogMatchList matches={[match()]} />)

    expect(screen.getByText("Don't Stop Believin'")).toBeInTheDocument()
    expect(screen.getByText('Journey')).toBeInTheDocument()
    expect(screen.getByText('Shared catalog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to my songs' })).toBeInTheDocument()
  })

  it('links to the edit page, with no add button, for a song already in the band\'s songs', () => {
    render(<CatalogMatchList matches={[match({ bandSongId: 'bs-7' })]} />)

    expect(screen.getByText('In your songs')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/songs/bs-7/edit')
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
  })

  it('says a removed song comes back, rather than being added from scratch', () => {
    render(<CatalogMatchList matches={[match({ removed: true })]} />)

    expect(screen.getByText('Removed from your songs')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add back' })).toBeInTheDocument()
  })

  it("labels the band's own private songs and falls back when the artist is unknown", () => {
    render(<CatalogMatchList matches={[match({ isMaster: false, artist: null })]} />)

    expect(screen.getByText('Your private song')).toBeInTheDocument()
    expect(screen.getByText('Unknown artist')).toBeInTheDocument()
  })

  it('renders one row per match', () => {
    render(
      <CatalogMatchList
        matches={[match({ songId: 'a', title: 'First' }), match({ songId: 'b', title: 'Second' })]}
      />
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
