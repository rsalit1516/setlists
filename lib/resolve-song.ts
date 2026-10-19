import type { Genre, Song, SongStatus } from '@/lib/types'

type BandSongFields = {
  id: string
  status: SongStatus
  singer: string | null
  keyboardRequired: boolean
  isActive: boolean
  updatedAt: Date
}

type GenericSong = Omit<Song, 'id' | 'status' | 'singer' | 'keyboardRequired' | 'genres'> & { genres?: Genre[] }

// The one place a band's view of a song is assembled: the generic Song plus that band's BandSong.
// The result is what the UI calls a Song, and its id is the BandSong id. Per-band overrides of key,
// BPM, lyrics etc. (#137/#138) will be applied here and nowhere else.
export function resolveSong(bandSong: BandSongFields, song: GenericSong): Song {
  return {
    ...song,
    id: bandSong.id,
    status: bandSong.status,
    singer: bandSong.singer,
    keyboardRequired: bandSong.keyboardRequired,
    isActive: bandSong.isActive && song.isActive,
    // Either side being touched counts as the song being touched (the "stuck in progress" stat
    // reads this), and a status change only bumps the BandSong.
    updatedAt: bandSong.updatedAt > song.updatedAt ? bandSong.updatedAt : song.updatedAt,
    genres: song.genres ?? [],
  }
}
