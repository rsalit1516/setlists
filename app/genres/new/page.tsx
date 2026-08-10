import Link from 'next/link'
import { GenreForm } from '@/components/genres/genre-form'
import { createGenre } from '../actions'

export default function NewGenrePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-6">
        <Link href="/genres" className="text-sm text-muted-foreground hover:underline">
          ← Genres
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add Genre</h1>
      </div>
      <GenreForm action={createGenre} />
    </div>
  )
}
