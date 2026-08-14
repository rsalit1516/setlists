import { describe, it, expect } from 'vitest'
import {
  containerId,
  parseContainerId,
  groupIntoContainers,
  findContainer,
  moveAcrossContainers,
  reorderWithinContainer,
} from './board-utils'
import type { SetlistItem, SetSection, Song } from '@/lib/types'

function makeSong(id: string): Song {
  return {
    id,
    title: `Song ${id}`,
    artist: null,
    key: null,
    singer: null,
    status: 'READY',
    keyboardRequired: false,
    durationSeconds: null,
    bpm: null,
    lyricsUrl: null,
    chartsUrl: null,
    lyrics: null,
    chartFileUrl: null,
    chartFileType: null,
    chartFileName: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    genres: [],
  }
}

function makeItem(id: string, section: SetSection, setNumber: number): SetlistItem {
  return {
    id,
    order: 0,
    section,
    setNumber,
    wasPlayed: null,
    isUnplanned: false,
    isActive: true,
    songId: `song-${id}`,
    setlistId: 'sl-1',
    song: makeSong(`song-${id}`),
  }
}

describe('containerId / parseContainerId', () => {
  it('round-trips section and set number', () => {
    expect(containerId('MAIN', 2)).toBe('MAIN:2')
    expect(parseContainerId('MAIN:2')).toEqual({ section: 'MAIN', setNumber: 2 })
  })
})

describe('groupIntoContainers', () => {
  it('buckets items by section/setNumber and includes empty containers', () => {
    const items = [
      makeItem('a', 'SOUNDCHECK', 1),
      makeItem('b', 'MAIN', 1),
      makeItem('c', 'MAIN', 1),
      makeItem('d', 'MAIN', 2),
    ]
    const containers = groupIntoContainers(items, ['SOUNDCHECK:1', 'MAIN:1', 'MAIN:2', 'ENCORE:1'])

    expect(containers['SOUNDCHECK:1'].map((i) => i.id)).toEqual(['a'])
    expect(containers['MAIN:1'].map((i) => i.id)).toEqual(['b', 'c'])
    expect(containers['MAIN:2'].map((i) => i.id)).toEqual(['d'])
    expect(containers['ENCORE:1']).toEqual([])
  })
})

describe('findContainer', () => {
  const containers = groupIntoContainers(
    [makeItem('a', 'SOUNDCHECK', 1), makeItem('b', 'MAIN', 1)],
    ['SOUNDCHECK:1', 'MAIN:1', 'ENCORE:1']
  )

  it('resolves a container id to itself', () => {
    expect(findContainer(containers, 'ENCORE:1')).toBe('ENCORE:1')
  })

  it('resolves an item id to the container holding it', () => {
    expect(findContainer(containers, 'b')).toBe('MAIN:1')
  })

  it('returns undefined for an unknown id', () => {
    expect(findContainer(containers, 'nope')).toBeUndefined()
  })
})

describe('moveAcrossContainers', () => {
  it('moves the active item into an empty container and updates its section/setNumber', () => {
    const containers = groupIntoContainers([makeItem('a', 'SOUNDCHECK', 1)], ['SOUNDCHECK:1', 'MAIN:2'])

    const next = moveAcrossContainers(containers, 'SOUNDCHECK:1', 'MAIN:2', 'a', 'MAIN:2')

    expect(next['SOUNDCHECK:1']).toEqual([])
    expect(next['MAIN:2'].map((i) => i.id)).toEqual(['a'])
    expect(next['MAIN:2'][0].section).toBe('MAIN')
    expect(next['MAIN:2'][0].setNumber).toBe(2)
  })

  it('inserts the active item before the hovered row in a non-empty container', () => {
    const containers = groupIntoContainers(
      [makeItem('a', 'SOUNDCHECK', 1), makeItem('b', 'MAIN', 1), makeItem('c', 'MAIN', 1)],
      ['SOUNDCHECK:1', 'MAIN:1']
    )

    const next = moveAcrossContainers(containers, 'SOUNDCHECK:1', 'MAIN:1', 'a', 'c')

    expect(next['MAIN:1'].map((i) => i.id)).toEqual(['b', 'a', 'c'])
  })

  it('is a no-op when the active item is not found in its claimed container', () => {
    const containers = groupIntoContainers([makeItem('a', 'SOUNDCHECK', 1)], ['SOUNDCHECK:1', 'MAIN:1'])

    const next = moveAcrossContainers(containers, 'SOUNDCHECK:1', 'MAIN:1', 'missing', 'MAIN:1')

    expect(next).toBe(containers)
  })
})

describe('reorderWithinContainer', () => {
  it('reorders when the drop position differs from the start position', () => {
    const containers = groupIntoContainers(
      [makeItem('a', 'MAIN', 1), makeItem('b', 'MAIN', 1), makeItem('c', 'MAIN', 1)],
      ['MAIN:1']
    )

    const next = reorderWithinContainer(containers, 'MAIN:1', 'a', 'c')

    expect(next['MAIN:1'].map((i) => i.id)).toEqual(['b', 'c', 'a'])
  })

  it('is a no-op when dropped back on its own position', () => {
    const containers = groupIntoContainers([makeItem('a', 'MAIN', 1), makeItem('b', 'MAIN', 1)], ['MAIN:1'])

    const next = reorderWithinContainer(containers, 'MAIN:1', 'a', 'a')

    expect(next).toBe(containers)
  })

  it('treats dropping on the container id itself as moving to the end', () => {
    const containers = groupIntoContainers(
      [makeItem('a', 'MAIN', 1), makeItem('b', 'MAIN', 1), makeItem('c', 'MAIN', 1)],
      ['MAIN:1']
    )

    const next = reorderWithinContainer(containers, 'MAIN:1', 'a', 'MAIN:1')

    expect(next['MAIN:1'].map((i) => i.id)).toEqual(['b', 'c', 'a'])
  })
})
