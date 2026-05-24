import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SongPickerPanel } from './song-picker-panel'
import type { Song } from '@/lib/types'

vi.mock('../../lib/db', () => ({ default: {} }))

vi.mock('../../app/setlists/actions', () => ({
  addItem: vi.fn().mockResolvedValue(undefined),
}))

const makeSong = (overrides: Partial<Song> & Pick<Song, 'id' | 'title' | 'status'>): Song => ({
  artist: null,
  key: null,
  singer: null,
  keyboardRequired: false,
  durationSeconds: null,
  orientation: null,
  bpm: null,
  lyricsUrl: null,
  chartsUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const mockSongs: Song[] = [
  makeSong({ id: '1', title: 'Ready Song', artist: 'Artist A', status: 'READY' }),
  makeSong({ id: '2', title: 'In Progress Song', status: 'IN_PROGRESS' }),
  makeSong({ id: '3', title: 'Wish Song', artist: 'Artist B', status: 'WISH' }),
]

const defaultProps = {
  allSongs: mockSongs,
  setlistId: 'sl-1',
  existingIds: new Set<string>(),
  displaySets: 1,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SongPickerPanel', () => {
  it('shows all songs when filter is All and existingIds is empty', () => {
    render(<SongPickerPanel {...defaultProps} />)
    expect(screen.getByText('Ready Song')).toBeInTheDocument()
    expect(screen.getByText('In Progress Song')).toBeInTheDocument()
    expect(screen.getByText('Wish Song')).toBeInTheDocument()
  })

  it('hides songs already in existingIds', () => {
    render(<SongPickerPanel {...defaultProps} existingIds={new Set(['1', '3'])} />)
    expect(screen.queryByText('Ready Song')).not.toBeInTheDocument()
    expect(screen.getByText('In Progress Song')).toBeInTheDocument()
    expect(screen.queryByText('Wish Song')).not.toBeInTheDocument()
  })

  it('filters to READY songs only', () => {
    render(<SongPickerPanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ready' }))
    expect(screen.getByText('Ready Song')).toBeInTheDocument()
    expect(screen.queryByText('In Progress Song')).not.toBeInTheDocument()
    expect(screen.queryByText('Wish Song')).not.toBeInTheDocument()
  })

  it('filters to IN_PROGRESS songs only', () => {
    render(<SongPickerPanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'In Progress' }))
    expect(screen.queryByText('Ready Song')).not.toBeInTheDocument()
    expect(screen.getByText('In Progress Song')).toBeInTheDocument()
    expect(screen.queryByText('Wish Song')).not.toBeInTheDocument()
  })

  it('filters to WISH songs only', () => {
    render(<SongPickerPanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Wish' }))
    expect(screen.queryByText('Ready Song')).not.toBeInTheDocument()
    expect(screen.queryByText('In Progress Song')).not.toBeInTheDocument()
    expect(screen.getByText('Wish Song')).toBeInTheDocument()
  })

  it('shows empty state when no songs match the filter', () => {
    render(<SongPickerPanel {...defaultProps} existingIds={new Set(['1'])} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ready' }))
    expect(screen.getByText('No songs available')).toBeInTheDocument()
  })

  it('calls addItem with correct FormData when + is clicked', async () => {
    const { addItem } = await import('../../app/setlists/actions')
    render(<SongPickerPanel {...defaultProps} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add Ready Song' }))
    })

    expect(addItem).toHaveBeenCalledOnce()
    const fd = vi.mocked(addItem).mock.calls[0][0] as FormData
    expect(fd.get('songId')).toBe('1')
    expect(fd.get('setlistId')).toBe('sl-1')
    expect(fd.get('section')).toBe('MAIN')
    expect(fd.get('setNumber')).toBe('1')
  })

  it('includes all sections in the target dropdown', () => {
    render(<SongPickerPanel {...defaultProps} displaySets={2} />)
    const select = screen.getByRole('combobox', { name: /add to/i })
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.text)
    expect(options).toContain('Soundcheck')
    expect(options).toContain('Set 1')
    expect(options).toContain('Set 2')
    expect(options).toContain('Encore')
  })
})
