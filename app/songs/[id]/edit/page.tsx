import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSong } from '@/lib/services/songs'
import { SongForm } from '@/components/songs/song-form'
import { updateSong } from '../../actions'
import type { SongStatus } from '@/lib/types'

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const song = await getSong(id)

  if (!song) notFound()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <Link href="/songs" className="text-sm text-muted-foreground hover:underline">
          ← Songs
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Edit Song</h1>
      </div>
      <SongForm
        song={{ ...song, status: song.status as SongStatus }}
        action={updateSong}
      />
    </div>
  )
}
