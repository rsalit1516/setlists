import Link from 'next/link'
import { getGenresWithSongCounts } from '@/lib/services/genres'
import { buttonVariants } from '@/components/ui/button'
import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button'
import { deactivateGenre } from './actions'

function deleteDescription(name: string, songCount: number): string {
  if (songCount === 0) return `Remove "${name}" from your genres?`
  const songs = songCount === 1 ? 'song' : 'songs'
  return `"${name}" is used by ${songCount} ${songs}. Deactivating will remove this genre from those songs.`
}

export default async function GenresPage() {
  const genres = await getGenresWithSongCounts()

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Genres</h1>
        <Link href="/genres/new" className={buttonVariants()}>
          + Add Genre
        </Link>
      </div>

      {genres.length === 0 ? (
        <p className="text-muted-foreground">No genres yet. Add your first one!</p>
      ) : (
        <ul className="space-y-3">
          {genres.map((genre) => {
            const deleteAction = deactivateGenre.bind(null, genre.id)
            return (
              <li key={genre.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <div className="min-w-0">
                  <p className="font-medium">{genre.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {genre.songCount} {genre.songCount === 1 ? 'song' : 'songs'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/genres/${genre.id}/edit`}
                    className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  >
                    Edit
                  </Link>
                  <DeleteConfirmButton
                    action={deleteAction}
                    description={deleteDescription(genre.name, genre.songCount)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
