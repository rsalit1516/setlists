'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { moveItem, removeItem, reorderItems, togglePlayed } from '@/app/setlists/actions'
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

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm ${playedClass(item.wasPlayed)} ${
        isDragging ? 'z-10 bg-muted/60' : ''
      }`}
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

      {/* Revision mode: played toggle */}
      {revision && (
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

export function SortableSongList({
  items,
  setlistId,
  revision,
}: {
  items: SetlistItem[]
  setlistId: string
  revision: boolean
}) {
  const [ordered, setOrdered] = useState(items)
  const [prevItems, setPrevItems] = useState(items)
  const [, startTransition] = useTransition()

  if (items !== prevItems) {
    setPrevItems(items)
    setOrdered(items)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (items.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted-foreground italic">No songs yet</p>
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = ordered.findIndex((i) => i.id === active.id)
    const newIndex = ordered.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const next = arrayMove(ordered, oldIndex, newIndex)
    setOrdered(next)
    startTransition(() => reorderItems(setlistId, next.map((i) => i.id)))
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={ordered.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="divide-y">
          {ordered.map((item, idx) => (
            <SortableRow key={item.id} item={item} idx={idx} count={ordered.length} revision={revision} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
