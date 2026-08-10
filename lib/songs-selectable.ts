import type { Song } from '@/lib/types'

// Shelved songs stay visible in the song catalog (so nobody loses the
// song's history/lyrics/chart) but are never offered when building a
// setlist — shelving is exactly the "don't pick this for a gig" signal.
export function selectableSongs(songs: Song[]): Song[] {
  return songs.filter((song) => song.status !== 'SHELVED')
}
