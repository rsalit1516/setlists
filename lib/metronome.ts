const LOOKAHEAD_SECONDS = 0.1
const TICK_MS = 25
const FIRST_BEAT_DELAY_SECONDS = 0.05

// Beats are scheduled against the audio clock a little ahead of time rather than fired from a bare
// setInterval, which drifts and stutters. onBeat gets the clock time the beat should sound at.
export function startBeatScheduler({
  bpm,
  now,
  onBeat,
}: {
  bpm: number
  now: () => number
  onBeat: (time: number) => void
}): () => void {
  const interval = 60 / bpm
  let next = now() + FIRST_BEAT_DELAY_SECONDS

  function tick() {
    const current = now()
    if (next < current) {
      next += Math.ceil((current - next) / interval) * interval
    }
    while (next < current + LOOKAHEAD_SECONDS) {
      onBeat(next)
      next += interval
    }
  }

  tick()
  const id = setInterval(tick, TICK_MS)
  return () => clearInterval(id)
}

export type MetronomeSettings = { flash: boolean; click: boolean }

export const DEFAULT_METRONOME_SETTINGS: MetronomeSettings = { flash: true, click: false }

const SETTINGS_KEY = 'metronome-settings'

export function loadMetronomeSettings(): MetronomeSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')
    return {
      flash: typeof raw?.flash === 'boolean' ? raw.flash : DEFAULT_METRONOME_SETTINGS.flash,
      click: typeof raw?.click === 'boolean' ? raw.click : DEFAULT_METRONOME_SETTINGS.click,
    }
  } catch {
    return DEFAULT_METRONOME_SETTINGS
  }
}

export function saveMetronomeSettings(settings: MetronomeSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // storage unavailable (private window, blocked) — settings just won't persist
  }
}
