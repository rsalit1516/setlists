import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { toggleSongsGenreFilter } from '@/app/songs/actions'
import type { Genre } from '@/lib/types'

// Multiple genres can be active at once (OR-match — see lib/services/songs.ts),
// unlike StatusFilter's single-select pills, so each pill toggles this one
// genre's membership in the current selection rather than replacing it.
//
// Each pill is its own <form> posting to a Server Action, not a <Link href>
// to a GET route handler — a GET reachable via <Link> gets invoked by
// Next.js's automatic viewport prefetching, which silently flipped this
// filter's cookie in the background since every pill sits in the viewport
// at once (see #72). Server Actions are POSTs and are never prefetched.
export function GenreFilter({ genres, selected }: { genres: Genre[]; selected: string[] }) {
  if (genres.length === 0) return null

  return (
    <nav aria-label="Song genre filter" className="mb-6 flex flex-wrap gap-2 print:hidden">
      {genres.map((genre) => {
        const isSelected = selected.includes(genre.id)
        return (
          <form key={genre.id} action={toggleSongsGenreFilter.bind(null, genre.id)} className="contents">
            <button
              type="submit"
              aria-pressed={isSelected}
              className={cn(buttonVariants({ variant: isSelected ? 'default' : 'outline' }), 'h-11 px-4')}
            >
              {genre.name}
            </button>
          </form>
        )
      })}
    </nav>
  )
}
