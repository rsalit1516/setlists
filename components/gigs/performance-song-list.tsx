'use client'

import type { PerformanceSong } from '@/lib/types'

function sectionLabel(item: PerformanceSong) {
  return item.section === 'MAIN' ? `Set ${item.setNumber}` : item.section
}

export function PerformanceSongList({
  items,
  activeIndex,
  onSelect,
}: {
  items: PerformanceSong[]
  activeIndex: number
  onSelect: (index: number) => void
}) {
  return (
    <ul className="flex-1 overflow-y-auto py-1">
      {items.map((item, i) => {
        const active = i === activeIndex
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={active ? 'true' : undefined}
              className={`flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
                {sectionLabel(item)}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.song.title}</span>
              {item.song.key && <span className="shrink-0 text-xs text-white/50">{item.song.key}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
