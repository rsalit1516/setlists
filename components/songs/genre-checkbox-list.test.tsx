import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GenreCheckboxList } from './genre-checkbox-list'

const genres = [
  { id: 'g-1', name: 'Dead' },
  { id: 'g-2', name: 'Funk' },
]

describe('GenreCheckboxList', () => {
  it('renders one checkbox per genre, checked according to defaultCheckedIds', () => {
    render(<GenreCheckboxList genres={genres} defaultCheckedIds={new Set(['g-1'])} />)

    expect(screen.getByLabelText('Dead')).toBeChecked()
    expect(screen.getByLabelText('Funk')).not.toBeChecked()
  })

  it('names each checkbox "genreIds", valued by genre id', () => {
    render(<GenreCheckboxList genres={genres} defaultCheckedIds={new Set()} />)

    const checkbox = screen.getByLabelText('Dead') as HTMLInputElement
    expect(checkbox.name).toBe('genreIds')
    expect(checkbox.value).toBe('g-1')
  })

  it('toggles freely with a click, with no confirmation prompt', () => {
    render(<GenreCheckboxList genres={genres} defaultCheckedIds={new Set(['g-1'])} />)

    fireEvent.click(screen.getByLabelText('Dead'))
    expect(screen.getByLabelText('Dead')).not.toBeChecked()

    fireEvent.click(screen.getByLabelText('Funk'))
    expect(screen.getByLabelText('Funk')).toBeChecked()
  })

  it('shows a fallback message instead of an empty checkbox list when there are no genres', () => {
    render(<GenreCheckboxList genres={[]} defaultCheckedIds={new Set()} />)

    expect(screen.getByText(/no genres yet/i)).toBeInTheDocument()
  })
})
