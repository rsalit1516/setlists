'use client'

import { useEffect, useRef, useState } from 'react'
import {
  loadMetronomeSettings,
  saveMetronomeSettings,
  startBeatScheduler,
  type MetronomeSettings,
} from '@/lib/metronome'
import { cn } from '@/lib/utils'

function playClick(ctx: AudioContext, time: number, pending: Set<OscillatorNode>) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = 1000
  gain.gain.setValueAtTime(0.6, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.06)
  pending.add(osc)
  osc.onended = () => pending.delete(osc)
}

// Mount with key={song.id}: unmounting is what stops the metronome when the song changes, so the
// drummer restarts it per song instead of it clicking through the banter at the wrong tempo.
export function MetronomeControl({ bpm }: { bpm: number }) {
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Settings only affect the closed popover and the flash, never first-paint markup, so reading
  // localStorage in the initializer can't cause a hydration mismatch.
  const [settings, setSettings] = useState<MetronomeSettings>(loadMetronomeSettings)
  const settingsRef = useRef(settings)
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!running) return
    const ctx = ctxRef.current
    if (!ctx) return

    const pendingClicks = new Set<OscillatorNode>()
    const timeouts = new Set<ReturnType<typeof setTimeout>>()
    const stop = startBeatScheduler({
      bpm,
      now: () => ctx.currentTime,
      onBeat: (time) => {
        if (settingsRef.current.click) playClick(ctx, time, pendingClicks)
        if (settingsRef.current.flash) {
          const id = setTimeout(
            () => {
              timeouts.delete(id)
              setBeat((b) => b + 1)
            },
            Math.max(0, (time - ctx.currentTime) * 1000)
          )
          timeouts.add(id)
        }
      },
    })

    return () => {
      stop()
      timeouts.forEach(clearTimeout)
      // Clicks are queued up to 100 ms ahead; stopping at 0 cancels any that haven't sounded yet.
      pendingClicks.forEach((osc) => osc.stop(0))
    }
  }, [running, bpm])

  useEffect(
    () => () => {
      ctxRef.current?.close().catch(() => {})
    },
    []
  )

  function updateSettings(patch: Partial<MetronomeSettings>) {
    const next = { ...settingsRef.current, ...patch }
    settingsRef.current = next
    setSettings(next)
    saveMetronomeSettings(next)
  }

  return (
    <div data-no-nav className="relative flex shrink-0 items-center">
      {running && settings.flash && beat > 0 && (
        <div key={beat} aria-hidden className="metronome-flash pointer-events-none fixed inset-0 z-40" />
      )}
      <button
        type="button"
        onClick={() => {
          if (!running) {
            const ctx = ctxRef.current ?? new AudioContext()
            ctxRef.current = ctx
            ctx.resume().catch(() => {})
          }
          setRunning((r) => !r)
        }}
        aria-pressed={running}
        aria-label={running ? `Stop metronome at ${bpm} BPM` : `Start metronome at ${bpm} BPM`}
        className={cn(
          'relative flex min-h-11 items-center gap-1.5 rounded-md px-3 tabular-nums',
          running ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
        )}
      >
        {running && settings.flash && beat > 0 && (
          <span key={beat} aria-hidden className="metronome-pulse pointer-events-none absolute inset-0 rounded-md" />
        )}
        <span aria-hidden>♩</span>
        {bpm} BPM
      </button>
      <button
        type="button"
        onClick={() => setSettingsOpen((o) => !o)}
        aria-expanded={settingsOpen}
        aria-label="Metronome settings"
        className="flex size-11 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
      >
        ⚙
      </button>
      {settingsOpen && (
        <div
          role="group"
          aria-label="Metronome settings"
          onKeyDown={(e) => e.key === 'Escape' && setSettingsOpen(false)}
          className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-white/10 bg-neutral-900 p-1 shadow-lg"
        >
          <label className="flex min-h-11 items-center gap-3 rounded px-3 hover:bg-white/10">
            <input
              type="checkbox"
              checked={settings.flash}
              onChange={(e) => updateSettings({ flash: e.target.checked })}
            />
            Flash
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded px-3 hover:bg-white/10">
            <input
              type="checkbox"
              checked={settings.click}
              onChange={(e) => updateSettings({ click: e.target.checked })}
            />
            Click
          </label>
        </div>
      )}
    </div>
  )
}
