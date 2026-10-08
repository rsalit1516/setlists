import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startBeatScheduler, loadMetronomeSettings, saveMetronomeSettings } from './metronome'

describe('startBeatScheduler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('schedules beats exactly 60/bpm apart on the audio clock, without drift', () => {
    let clock = 0
    const beats: number[] = []
    const stop = startBeatScheduler({ bpm: 120, now: () => clock, onBeat: (t) => beats.push(t) })

    for (let i = 0; i < 400; i++) {
      clock += 0.025
      vi.advanceTimersByTime(25)
    }
    stop()

    expect(beats.length).toBeGreaterThan(15)
    for (let i = 1; i < beats.length; i++) expect(beats[i] - beats[i - 1]).toBeCloseTo(0.5, 10)
  })

  it('stops scheduling after the returned stop function is called', () => {
    let clock = 0
    const onBeat = vi.fn()
    const stop = startBeatScheduler({ bpm: 120, now: () => clock, onBeat })
    stop()
    const calls = onBeat.mock.calls.length

    clock += 5
    vi.advanceTimersByTime(5000)

    expect(onBeat).toHaveBeenCalledTimes(calls)
  })
})

describe('metronome settings persistence', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to flash on, click off', () => {
    expect(loadMetronomeSettings()).toEqual({ flash: true, click: false })
  })

  it('round-trips saved settings', () => {
    saveMetronomeSettings({ flash: false, click: true })
    expect(loadMetronomeSettings()).toEqual({ flash: false, click: true })
  })

  it('falls back to defaults on corrupt stored data', () => {
    localStorage.setItem('metronome-settings', '{nope')
    expect(loadMetronomeSettings()).toEqual({ flash: true, click: false })
  })
})
