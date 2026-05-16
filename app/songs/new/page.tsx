import Link from 'next/link'
import { SongForm } from '@/components/songs/song-form'
import { createSong } from '../actions'

export default function NewSongPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <Link href="/songs" className="text-sm text-muted-foreground hover:underline">
          ← Songs
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add Song</h1>
      </div>
      <SongForm action={createSong} />
    </div>
  )
}
