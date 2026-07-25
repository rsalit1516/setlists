'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'
import Link from 'next/link'
import type { GigPerformanceData } from '@/lib/types'

const CHART_CACHE = 'performance-chart-files'

export function PerformanceView({ gig }: { gig: GigPerformanceData }) {
  const items = gig.items
  const chartUrls = useMemo(
    () => Array.from(new Set(items.map((i) => i.song.chartFileUrl).filter((u): u is string => !!u))),
    [items]
  )

  const [phase, setPhase] = useState<'preflight' | 'ready'>(chartUrls.length === 0 ? 'ready' : 'preflight')
  const [cachedCount, setCachedCount] = useState(0)
  const [index, setIndex] = useState(0)
  const [view, setView] = useState<'lyrics' | 'chart'>('lyrics')
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const touchStartX = useRef<number | null>(null)

  const current = items[index]
  const hasLyrics = !!current?.song.lyrics
  const hasChart = !!current?.song.chartFileUrl

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (phase !== 'preflight') return
    let cancelled = false

    async function run() {
      if (!('caches' in window)) {
        if (!cancelled) setPhase('ready')
        return
      }
      const cache = await caches.open(CHART_CACHE)
      let done = 0
      await Promise.all(
        chartUrls.map(async (url) => {
          try {
            const existing = await cache.match(url)
            if (!existing) {
              const res = await fetch(url)
              if (res.ok || res.type === 'opaque') await cache.put(url, res.clone())
            }
          } catch {
            // best-effort: song still shows via network if online
          } finally {
            done++
            if (!cancelled) setCachedCount(done)
          }
        })
      )
      if (!cancelled) setPhase('ready')
    }

    run()
    return () => {
      cancelled = true
    }
  }, [phase, chartUrls])

  useEffect(() => {
    if (phase !== 'ready') return

    async function acquire() {
      try {
        if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen')
      } catch {
        // not critical — screen may just time out on unsupported devices
      }
    }
    acquire()

    function handleVisibility() {
      if (document.visibilityState === 'visible') acquire()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [phase])

  function navigateTo(newIndex: number) {
    const clamped = Math.max(0, Math.min(newIndex, items.length - 1))
    setIndex(clamped)
    setView(items[clamped]?.song.lyrics ? 'lyrics' : 'chart')
  }
  function goNext() {
    navigateTo(index + 1)
  }
  function goPrev() {
    navigateTo(index - 1)
  }

  useEffect(() => {
    if (phase !== 'ready') return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') navigateTo(index + 1)
      else if (e.key === 'ArrowLeft') navigateTo(index - 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, items.length])
  function handleTouchStart(e: ReactTouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: ReactTouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 60) (dx < 0 ? goNext : goPrev)()
    touchStartX.current = null
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6 text-center text-white">
        <div>
          <p className="mb-4 text-lg">This setlist has no songs yet.</p>
          <Link href={`/gigs/${gig.id}`} className="underline">
            Back to gig
          </Link>
        </div>
      </div>
    )
  }

  if (phase === 'preflight') {
    const pct = chartUrls.length ? (cachedCount / chartUrls.length) * 100 : 100
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <p className="text-lg font-medium">Preparing offline setlist…</p>
        <p className="text-sm text-white/70">
          {cachedCount} / {chartUrls.length} charts ready
        </p>
        <div className="h-2 w-64 overflow-hidden rounded-full bg-white/20">
          <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
        </div>
        {cachedCount === chartUrls.length && (
          <button
            onClick={() => setPhase('ready')}
            className="mt-2 min-h-11 rounded-lg bg-white px-6 text-sm font-medium text-black"
          >
            Go
          </button>
        )}
        <Link href={`/gigs/${gig.id}`} className="flex min-h-11 items-center text-xs text-white/50 underline">
          Cancel
        </Link>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 flex flex-col overscroll-none bg-black text-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1.5 text-sm">
        <Link
          href={`/gigs/${gig.id}`}
          aria-label="Exit performance mode"
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </Link>
        <span className="shrink-0 tabular-nums text-white/60">
          {index + 1} / {items.length}
        </span>
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs uppercase tracking-wide text-white/60">
          {current.section === 'MAIN' ? `Set ${current.setNumber}` : current.section}
        </span>
        <span className="min-w-0 flex-1 truncate text-center font-semibold">{current.song.title}</span>
        {current.song.key && <span className="shrink-0 text-white/60">{current.song.key}</span>}
        {hasLyrics && hasChart && (
          <div className="flex shrink-0 overflow-hidden rounded-md border border-white/20 text-xs">
            <button
              onClick={() => setView('lyrics')}
              className={`min-h-9 px-3 ${view === 'lyrics' ? 'bg-white text-black' : 'text-white/60'}`}
            >
              Lyrics
            </button>
            <button
              onClick={() => setView('chart')}
              className={`min-h-9 px-3 ${view === 'chart' ? 'bg-white text-black' : 'text-white/60'}`}
            >
              Chart
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">
        {view === 'lyrics' || !hasChart ? (
          hasLyrics ? (
            <div className="h-full overflow-y-auto px-6 py-8">
              <p className="mx-auto max-w-2xl whitespace-pre-wrap text-2xl leading-relaxed sm:text-3xl">
                {current.song.lyrics}
              </p>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-white/40">
              No lyrics or chart for this song.
            </div>
          )
        ) : current.song.chartFileType === 'application/pdf' ? (
          <iframe
            src={current.song.chartFileUrl!}
            title={current.song.title}
            className="h-full w-full bg-white"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.song.chartFileUrl!}
            alt={current.song.title}
            className="h-full w-full object-contain"
          />
        )}

        {/* Tap zones (skip when a PDF iframe owns the surface, so its scroll/zoom still works) */}
        {!(view === 'chart' && current.song.chartFileType === 'application/pdf') && (
          <>
            <button
              onClick={goPrev}
              disabled={index === 0}
              aria-label="Previous song"
              className="absolute inset-y-0 left-0 w-1/4 disabled:cursor-default"
            />
            <button
              onClick={goNext}
              disabled={index === items.length - 1}
              aria-label="Next song"
              className="absolute inset-y-0 right-0 w-1/4 disabled:cursor-default"
            />
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between border-t border-white/10 px-3 py-1.5 text-sm">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="min-h-11 rounded-md px-4 text-white/70 disabled:opacity-30"
        >
          ◀ Prev
        </button>
        <button
          onClick={goNext}
          disabled={index === items.length - 1}
          className="min-h-11 rounded-md px-4 text-white/70 disabled:opacity-30"
        >
          Next ▶
        </button>
      </div>
    </div>
  )
}
