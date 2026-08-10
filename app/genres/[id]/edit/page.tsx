import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getGenre } from '@/lib/services/genres'
import { GenreForm } from '@/components/genres/genre-form'
import { updateGenre } from '../../actions'

export default async function EditGenrePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const genre = await getGenre(id)

  if (!genre) notFound()

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-6">
        <Link href="/genres" className="text-sm text-muted-foreground hover:underline">
          ← Genres
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Edit Genre</h1>
      </div>
      <GenreForm genre={genre} action={updateGenre} />
    </div>
  )
}
