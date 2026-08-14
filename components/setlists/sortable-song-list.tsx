'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { moveItem, removeItem, togglePlayed } from '@/app/setlists/actions'
import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button'
import type { SetlistItem } from '@/lib/types'

function formatDuration(s: number | null) {
  if (!s) return null
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function playedClass(wasPlayed: boolean | null) {
  if (wasPlayed === true) return 'text-green-600 dark:text-green-400'
  if (wasPlayed === false) return 'text-red-500 line-through opacity-60 dark:text-red-400'
  return ''
}

function SortableRow({
  item,
  idx,
  count,
  revision,
}: {
  item: SetlistItem
  idx: number
  count: number
  revision: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const moveUpAction = moveItem.bind(null, item.id, 'up')
  const moveDownAction = moveItem.bind(null, item.id, 'down')
  const removeAction = removeItem.bind(null, item.id)
  const toggleAction = togglePlayed.bind(null, item.id, item.wasPlayed)
  // Soundcheck run-throughs don't count as real plays (see stats.ts), so the
  // played/skipped toggle has no purpose there — hide it and its styling.
  const isSoundcheck = item.section === 'SOUNDCHECK'

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm ${
        isSoundcheck ? '' : playedClass(item.wasPlayed)
      } ${isDragging ? 'z-10 bg-muted/60' : ''}`}
    >
      {/* Drag handle */}
      {!revision && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="touch-none flex h-5 w-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {/* Reorder buttons */}
      <div className="flex flex-col">
        <form action={moveUpAction}>
          <button
            type="submit"
            disabled={idx === 0}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
            aria-label="Move up"
          >
            ▲
          </button>
        </form>
        <form action={moveDownAction}>
          <button
            type="submit"
            disabled={idx === count - 1}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
            aria-label="Move down"
          >
            ▼
          </button>
        </form>
      </div>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <span className="font-medium">{item.song.title}</span>
        {item.song.key && (
          <span className="ml-2 text-xs text-muted-foreground">{item.song.key}</span>
        )}
        {item.isUnplanned && (
          <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            unplanned
          </span>
        )}
      </div>

      {/* Duration */}
      {item.song.durationSeconds && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDuration(item.song.durationSeconds)}
        </span>
      )}

      {/* Revision mode: played toggle — not for Soundcheck, which stats ignore */}
      {revision && !isSoundcheck && (
        <form action={toggleAction}>
          <button
            type="submit"
            className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
              item.wasPlayed === true
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : item.wasPlayed === false
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {item.wasPlayed === true ? '✓ Played' : item.wasPlayed === false ? '✗ Skipped' : 'Mark'}
          </button>
        </form>
      )}

      {/* Remove */}
      <DeleteConfirmButton
        action={removeAction}
        variant="icon"
        ariaLabel="Remove song"
        description={`Remove "${item.song.title}" from this setlist?`}
      />
    </li>
  )
}

// Renders one section's rows as a droppable + sortable container. The
// DndContext lives one level up in SetlistBoard, spanning every section, so
// a drag can cross from one set into another (#82) — this component only
// registers itself as a drop target and reports within-container reorders
// up through its parent's shared drag handlers.
export function SortableSongList({
  items,
  revision,
  containerId,
}: {
  items: SetlistItem[]
  revision: boolean
  containerId: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: containerId })

  return (
    <SortableContext id={containerId} items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
      <ul ref={setNodeRef} className={`divide-y transition-colors ${isOver ? 'bg-accent/40' : ''}`}>
        {items.length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted-foreground italic">No songs yet</li>
        ) : (
          items.map((item, idx) => (
            <SortableRow key={item.id} item={item} idx={idx} count={items.length} revision={revision} />
          ))
        )}
      </ul>
    </SortableContext>
  )
}
