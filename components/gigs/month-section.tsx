'use client'

import { useCallback, useId, useSyncExternalStore } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function storageKey(monthKey: string) {
  return `gigs:monthOpen:${monthKey}`
}

// localStorage writes don't notify the tab that made them (the `storage` event only
// fires in *other* tabs), so we fan out same-tab updates through this listener set —
// keeps the toggle hydration-safe via useSyncExternalStore instead of an effect+setState.
const listeners = new Set<() => void>()

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

function readStoredExpanded(monthKey: string): boolean | null {
  const stored = window.localStorage.getItem(storageKey(monthKey))
  return stored === null ? null : stored === 'true'
}

function writeStoredExpanded(monthKey: string, expanded: boolean) {
  window.localStorage.setItem(storageKey(monthKey), String(expanded))
  listeners.forEach((notify) => notify())
}

function getServerSnapshot() {
  return null
}

export function MonthSection({
  monthKey,
  label,
  count,
  defaultExpanded,
  children,
}: {
  monthKey: string
  label: string
  count: number
  defaultExpanded: boolean
  children: React.ReactNode
}) {
  const contentId = useId()
  const getSnapshot = useCallback(() => readStoredExpanded(monthKey), [monthKey])
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const expanded = stored ?? defaultExpanded

  function toggle() {
    writeStoredExpanded(monthKey, !expanded)
  }

  return (
    <section>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="flex min-h-11 w-full items-center justify-between gap-2 py-2 text-left"
      >
        <span className="text-sm font-semibold text-muted-foreground">
          {label} <span className="font-normal">({count})</span>
        </span>
        <ChevronDownIcon
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', !expanded && '-rotate-90')}
        />
      </button>
      {expanded && (
        <div id={contentId} className="space-y-2">
          {children}
        </div>
      )}
    </section>
  )
}
