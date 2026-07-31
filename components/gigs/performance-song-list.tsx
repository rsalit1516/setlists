'use client'

import type { PerformanceSong } from '@/lib/types'

function sectionLabel(item: PerformanceSong) {
  return item.section === 'MAIN' ? `Set ${item.setNumber}` : item.section
}

type Row = { item: PerformanceSong; index: number; position: number }
type Group = { label: string; rows: Row[] }

function groupItems(items: PerformanceSong[]): Group[] {
  const groups: Group[] = []
  items.forEach((item, index) => {
    const label = sectionLabel(item)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup?.label === label) {
      lastGroup.rows.push({ item, index, position: lastGroup.rows.length + 1 })
    } else {
      groups.push({ label, rows: [{ item, index, position: 1 }] })
    }
  })
  return groups
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
  const groups = groupItems(items)
  return (
    <div className="flex-1 overflow-y-auto py-1">
      {groups.map((group) => (
        <div key={group.rows[0].item.id}>
          <div className="sticky top-0 z-10 bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {group.label}
          </div>
          <ul>
            {group.rows.map(({ item, index, position }) => {
              const active = index === activeIndex
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(index)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] tabular-nums text-white/60">
                      {position}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.song.title}</span>
                    {item.song.key && <span className="shrink-0 text-xs text-white/50">{item.song.key}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
