import { describe, it, expect } from 'vitest'
import { selectableSongs } from './songs-selectable'
import type { Song } from '@/lib/types'

function song(overrides: Partial<Song>): Song {
  return {
    id: 's-1',
    title: 'Test Song',
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
    ...overrides,
  }
}

describe('selectableSongs', () => {
  it('excludes shelved songs', () => {
    const songs = [
      song({ id: '1', status: 'READY' }),
      song({ id: '2', status: 'SHELVED' }),
      song({ id: '3', status: 'IN_PROGRESS' }),
      song({ id: '4', status: 'WISH' }),
    ]

    expect(selectableSongs(songs).map((s) => s.id)).toEqual(['1', '3', '4'])
  })

  it('returns an empty array when every song is shelved', () => {
    const songs = [song({ id: '1', status: 'SHELVED' })]
    expect(selectableSongs(songs)).toEqual([])
  })

  it('returns all songs unchanged when none are shelved', () => {
    const songs = [song({ id: '1', status: 'READY' }), song({ id: '2', status: 'WISH' })]
    expect(selectableSongs(songs)).toEqual(songs)
  })
})
