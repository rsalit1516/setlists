import type { GigSetlistItem } from '@/lib/types'

// A single-set gig with more songs than this fits comfortably in one printed
// column, so it gets split across two columns instead of overflowing onto a
// second page.
const SPLIT_THRESHOLD = 14

export type PrintSong = {
  title: string
  key: string | null
  displayNumber: number
}

export type PrintColumn = {
  label: string
  songs: PrintSong[]
}

export type PrintLayout = {
  soundcheck: PrintSong[]
  columns: PrintColumn[]
  encore: PrintSong[]
}

function toPrintSongs(items: GigSetlistItem[]): PrintSong[] {
  return items.map((item, i) => ({
    title: item.song.title,
    key: item.song.key,
    displayNumber: i + 1,
  }))
}

export function buildPrintLayout(items: GigSetlistItem[]): PrintLayout {
  const soundcheck = toPrintSongs(items.filter((i) => i.section === 'SOUNDCHECK'))
  const encore = toPrintSongs(items.filter((i) => i.section === 'ENCORE'))
  const main = items.filter((i) => i.section === 'MAIN')
  const setNumbers = Array.from(new Set(main.map((i) => i.setNumber))).sort((a, b) => a - b)

  if (setNumbers.length <= 1 && main.length > SPLIT_THRESHOLD) {
    const mid = Math.ceil(main.length / 2)
    return {
      soundcheck,
      encore,
      columns: [
        { label: 'Set 1', songs: toPrintSongs(main.slice(0, mid)) },
        {
          label: 'Set 1 (cont.)',
          songs: main.slice(mid).map((item, i) => ({
            title: item.song.title,
            key: item.song.key,
            displayNumber: mid + i + 1,
          })),
        },
      ],
    }
  }

  return {
    soundcheck,
    encore,
    columns: setNumbers.map((setNum) => ({
      label: `Set ${setNum}`,
      songs: toPrintSongs(main.filter((i) => i.setNumber === setNum)),
    })),
  }
}
