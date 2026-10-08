import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MetronomeControl } from './metronome-control'

const oscillatorStart = vi.fn()

class FakeAudioContext {
  currentTime = 0
  destination = {}
  resume = vi.fn().mockResolvedValue(undefined)
  close = vi.fn().mockResolvedValue(undefined)
  createOscillator() {
    return { frequency: { value: 0 }, connect: vi.fn(), start: oscillatorStart, stop: vi.fn() }
  }
  createGain() {
    return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  oscillatorStart.mockClear()
  vi.stubGlobal('AudioContext', FakeAudioContext)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('MetronomeControl', () => {
  it('shows the BPM and toggles between start and stop', () => {
    render(<MetronomeControl bpm={108} />)

    const button = screen.getByRole('button', { name: 'Start metronome at 108 BPM' })
    expect(screen.getByText('108 BPM')).toBeInTheDocument()

    fireEvent.click(button)
    expect(screen.getByRole('button', { name: 'Stop metronome at 108 BPM' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Stop metronome at 108 BPM' }))
    expect(screen.getByRole('button', { name: 'Start metronome at 108 BPM' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('is silent by default (click off) but still flashes', () => {
    const { container } = render(<MetronomeControl bpm={120} />)
    fireEvent.click(screen.getByRole('button', { name: /start metronome/i }))

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(oscillatorStart).not.toHaveBeenCalled()
    expect(container.querySelector('.metronome-flash')).toBeInTheDocument()
  })

  it('plays a click once the Click option is turned on, and remembers it', () => {
    const { unmount } = render(<MetronomeControl bpm={120} />)
    fireEvent.click(screen.getByRole('button', { name: 'Metronome settings' }))
    fireEvent.click(screen.getByLabelText('Click'))
    fireEvent.click(screen.getByRole('button', { name: /start metronome/i }))

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(oscillatorStart).toHaveBeenCalled()

    unmount()
    render(<MetronomeControl bpm={120} />)
    fireEvent.click(screen.getByRole('button', { name: 'Metronome settings' }))
    expect(screen.getByLabelText('Click')).toBeChecked()
    expect(screen.getByLabelText('Flash')).toBeChecked()
  })

  it('does not flash when Flash is turned off', () => {
    const { container } = render(<MetronomeControl bpm={120} />)
    fireEvent.click(screen.getByRole('button', { name: 'Metronome settings' }))
    fireEvent.click(screen.getByLabelText('Flash'))
    fireEvent.click(screen.getByRole('button', { name: /start metronome/i }))

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(container.querySelector('.metronome-flash')).not.toBeInTheDocument()
  })
})
