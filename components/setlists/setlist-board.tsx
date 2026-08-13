'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { moveItemToSection, reorderItems } from '@/app/setlists/actions'
import {
  containerId,
  findContainer,
  groupIntoContainers,
  moveAcrossContainers,
  parseContainerId,
  reorderWithinContainer,
} from './board-utils'
import { SetlistSection } from './setlist-section'
import { buttonVariants } from '@/components/ui/button'
import type { SetlistItem, Song } from '@/lib/types'

// Owns the single DndContext that spans Soundcheck, every numbered Set, and
// Encore (#82) — dnd-kit scopes drag/drop to one context, so this has to
// live above all the sections for a drag to see across set boundaries.
// onDragOver moves the item between containers as the pointer crosses a
// boundary (optimistic, client-only); onDragEnd settles its final position
// and persists via reorderItems (same container) or moveItemToSection
// (crossed into a different section/setNumber).
export function SetlistBoard({
  setlistId,
  items,
  displaySets,
  allSongs,
  revision,
}: {
  setlistId: string
  items: SetlistItem[]
  displaySets: number
  allSongs: Song[]
  revision: boolean
}) {
  const soundcheckId = containerId('SOUNDCHECK', 1)
  const encoreId = containerId('ENCORE', 1)
  const mainIds = Array.from({ length: displaySets }, (_, i) => containerId('MAIN', i + 1))
  const containerIds = [soundcheckId, ...mainIds, encoreId]

  const [containers, setContainers] = useState(() => groupIntoContainers(items, containerIds))
  const [prevItems, setPrevItems] = useState(items)
  const [dragOrigin, setDragOrigin] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  if (items !== prevItems) {
    setPrevItems(items)
    setContainers(groupIntoContainers(items, containerIds))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragStart(event: DragStartEvent) {
    setDragOrigin(findContainer(containers, String(event.active.id)) ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeContainerId = findContainer(containers, String(active.id))
    const overContainerId = findContainer(containers, String(over.id))
    if (!activeContainerId || !overContainerId || activeContainerId === overContainerId) return

    setContainers((prev) =>
      moveAcrossContainers(prev, activeContainerId, overContainerId, String(active.id), String(over.id))
    )
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const originContainerId = dragOrigin
    setDragOrigin(null)
    if (!over || !originContainerId) return

    const activeContainerId = findContainer(containers, String(active.id))
    if (!activeContainerId) return

    const settled = reorderWithinContainer(containers, activeContainerId, String(active.id), String(over.id))
    setContainers(settled)

    const destinationOrderedIds = settled[activeContainerId].map((i) => i.id)

    if (activeContainerId === originContainerId) {
      startTransition(() => reorderItems(setlistId, destinationOrderedIds))
    } else {
      const { section, setNumber } = parseContainerId(activeContainerId)
      const sourceOrderedIds = (settled[originContainerId] ?? []).map((i) => i.id)
      startTransition(() =>
        moveItemToSection(
          setlistId,
          String(active.id),
          { section, setNumber },
          destinationOrderedIds,
          sourceOrderedIds
        )
      )
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <SetlistSection
          label="Soundcheck"
          items={containers[soundcheckId] ?? []}
          setlistId={setlistId}
          section="SOUNDCHECK"
          setNumber={1}
          allSongs={allSongs}
          revision={revision}
        />

        {mainIds.map((id, idx) => (
          <SetlistSection
            key={id}
            label={`Set ${idx + 1}`}
            items={containers[id] ?? []}
            setlistId={setlistId}
            section="MAIN"
            setNumber={idx + 1}
            allSongs={allSongs}
            revision={revision}
          />
        ))}

        {/* Add another set */}
        {!revision && (
          <div className="flex justify-center">
            <Link
              href={`/setlists/${setlistId}?sets=${displaySets + 1}`}
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              + Add Set {displaySets + 1}
            </Link>
          </div>
        )}

        <SetlistSection
          label="Encore"
          items={containers[encoreId] ?? []}
          setlistId={setlistId}
          section="ENCORE"
          setNumber={1}
          allSongs={allSongs}
          revision={revision}
        />
      </div>
    </DndContext>
  )
}
