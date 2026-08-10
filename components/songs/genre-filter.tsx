import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { toggleGenreId } from '@/lib/songs-genre-filter'
import type { Genre } from '@/lib/types'

function hrefFor(selected: string[]): string {
  return selected.length ? `/songs?genres=${selected.join(',')}` : '/songs'
}

// Multiple genres can be active at once (OR-match — see lib/services/songs.ts),
// unlike StatusFilter's single-select pills, so each link toggles this one
// genre's membership in the current selection rather than replacing it.
export function GenreFilter({ genres, selected }: { genres: Genre[]; selected: string[] }) {
  if (genres.length === 0) return null

  return (
    <nav aria-label="Song genre filter" className="mb-6 flex flex-wrap gap-2 print:hidden">
      {genres.map((genre) => {
        const isSelected = selected.includes(genre.id)
        const nextSelected = toggleGenreId(selected, genre.id)
        return (
          <Link
            key={genre.id}
            href={`/api/genre-filter?genres=${encodeURIComponent(nextSelected.join(','))}&redirect=${encodeURIComponent(hrefFor(nextSelected))}`}
            aria-pressed={isSelected}
            className={cn(buttonVariants({ variant: isSelected ? 'default' : 'outline' }), 'h-11 px-4')}
          >
            {genre.name}
          </Link>
        )
      })}
    </nav>
  )
}
