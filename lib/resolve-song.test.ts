import { describe, it, expect } from 'vitest'
import { resolveSong } from './resolve-song'

const earlier = new Date('2026-01-01')
const later = new Date('2026-03-01')

const song = {
  id: 'song-1',
  title: 'Wonderwall',
  artist: 'Oasis',
  key: 'F#m',
  durationSeconds: 258,
  bpm: 87,
  lyricsUrl: null,
  chartsUrl: null,
  lyrics: '<p>Today is gonna be the day</p>',
  lyricsSource: null,
  lyricsSourceUrl: null,
  lyricsImportedAt: null,
  lyricsUpdatedAt: null,
  chartFileUrl: null,
  chartFileType: null,
  chartFileName: null,
  isActive: true,
  createdAt: earlier,
  updatedAt: earlier,
  ownerBandId: null,
}

const bandSong = {
  id: 'bs-1',
  status: 'IN_PROGRESS' as const,
  singer: 'Dana',
  keyboardRequired: true,
  isActive: true,
  updatedAt: earlier,
}

describe('resolveSong', () => {
  it("uses the BandSong id and the band's own status, singer and keyboard flag", () => {
    const result = resolveSong(bandSong, song)
    expect(result.id).toBe('bs-1')
    expect(result).toMatchObject({ status: 'IN_PROGRESS', singer: 'Dana', keyboardRequired: true })
  })

  it('takes the shared fields from the generic song', () => {
    const result = resolveSong(bandSong, song)
    expect(result).toMatchObject({ title: 'Wonderwall', artist: 'Oasis', key: 'F#m', bpm: 87, lyrics: song.lyrics })
    expect(result.ownerBandId).toBeNull()
  })

  it('is active only when both the band entry and the song are active', () => {
    expect(resolveSong(bandSong, song).isActive).toBe(true)
    expect(resolveSong({ ...bandSong, isActive: false }, song).isActive).toBe(false)
    expect(resolveSong(bandSong, { ...song, isActive: false }).isActive).toBe(false)
  })

  it('reports the later of the two updatedAt values, so a status change counts as a touch', () => {
    expect(resolveSong({ ...bandSong, updatedAt: later }, song).updatedAt).toBe(later)
    expect(resolveSong(bandSong, { ...song, updatedAt: later }).updatedAt).toBe(later)
  })

  it('defaults genres to an empty list and keeps them when present', () => {
    expect(resolveSong(bandSong, song).genres).toEqual([])
    const genre = { id: 'g-1', name: 'Rock', isActive: true, createdAt: earlier, updatedAt: earlier }
    expect(resolveSong(bandSong, { ...song, genres: [genre] }).genres).toEqual([genre])
  })
})
