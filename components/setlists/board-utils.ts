import { arrayMove } from '@dnd-kit/sortable'
import type { SetlistItem, SetSection } from '@/lib/types'

// A "container" is one drop zone in the cross-set board — Soundcheck, a
// numbered Set, or Encore — keyed as `${section}:${setNumber}` so it can be
// used directly as a dnd-kit droppable/SortableContext id.
export type Containers = Record<string, SetlistItem[]>

export function containerId(section: SetSection, setNumber: number): string {
  return `${section}:${setNumber}`
}

export function parseContainerId(id: string): { section: SetSection; setNumber: number } {
  const [section, setNumber] = id.split(':')
  return { section: section as SetSection, setNumber: Number(setNumber) }
}

export function groupIntoContainers(items: SetlistItem[], containerIds: string[]): Containers {
  const containers: Containers = Object.fromEntries(containerIds.map((id) => [id, []]))
  for (const item of items) {
    const id = containerId(item.section, item.setNumber)
    ;(containers[id] ??= []).push(item)
  }
  return containers
}

// `id` may be a container id itself (dropping on an empty container's droppable)
// or an item id (dropping on/over a row) — resolve either to the container
// that currently holds it.
export function findContainer(containers: Containers, id: string): string | undefined {
  if (id in containers) return id
  return Object.keys(containers).find((key) => containers[key].some((item) => item.id === id))
}

// Called on dragOver while the pointer is over a different container than the
// one the drag started in — moves the active item across, updating its
// section/setNumber, and inserts it at the hovered position (or the end, if
// hovering the container itself rather than a specific row).
export function moveAcrossContainers(
  containers: Containers,
  activeContainerId: string,
  overContainerId: string,
  activeId: string,
  overId: string
): Containers {
  const activeItems = containers[activeContainerId]
  const overItems = containers[overContainerId]
  const activeIndex = activeItems?.findIndex((i) => i.id === activeId) ?? -1
  if (activeIndex === -1 || !overItems) return containers

  const { section, setNumber } = parseContainerId(overContainerId)
  const movedItem: SetlistItem = { ...activeItems[activeIndex], section, setNumber }

  const overIndex = overItems.findIndex((i) => i.id === overId)
  const insertAt = overIndex >= 0 ? overIndex : overItems.length

  return {
    ...containers,
    [activeContainerId]: activeItems.filter((i) => i.id !== activeId),
    [overContainerId]: [...overItems.slice(0, insertAt), movedItem, ...overItems.slice(insertAt)],
  }
}

// Called on dragEnd to fine-tune the final position within whichever
// container the item ended up in (cross-container placement already happened
// during dragOver; this just handles same-container reordering, including
// the final settle after a cross-container move).
export function reorderWithinContainer(
  containers: Containers,
  targetContainerId: string,
  activeId: string,
  overId: string
): Containers {
  const items = containers[targetContainerId]
  if (!items) return containers

  const oldIndex = items.findIndex((i) => i.id === activeId)
  const newIndex = overId === targetContainerId ? items.length - 1 : items.findIndex((i) => i.id === overId)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return containers

  return { ...containers, [targetContainerId]: arrayMove(items, oldIndex, newIndex) }
}
