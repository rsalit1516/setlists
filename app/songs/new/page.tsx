import Link from 'next/link'
import { SongForm } from '@/components/songs/song-form'
import { CatalogMatchList } from '@/components/songs/catalog-match-list'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getBandContext } from '@/lib/band'
import { getGenres } from '@/lib/services/genres'
import { searchCatalog } from '@/lib/services/songs'
import { createSong } from '../actions'

export default async function NewSongPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; artist?: string; create?: string }>
}) {
  const { title = '', artist = '', create } = await searchParams

  if (create === '1') {
    const genres = await getGenres()
    // Arriving here from the search results means the user has seen the matches and chose to create
    // anyway; a direct visit has not, so the form leaves the duplicate check on.
    const seenMatches = title.trim() !== ''
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6">
          <Link href="/songs/new" className="text-sm text-muted-foreground hover:underline">
            ← Search again
          </Link>
          <h1 className="mt-2 text-2xl font-bold">New song</h1>
          <p className="text-sm text-muted-foreground">Songs you create are private to your band.</p>
        </div>
        <SongForm genres={genres} action={createSong} initial={{ title, artist }} allowDuplicate={seenMatches} />
      </div>
    )
  }

  const { bandId } = await getBandContext()
  const searched = title.trim() !== ''
  const matches = searched ? await searchCatalog(bandId, { title, artist }) : []
  const createHref = `/songs/new?${new URLSearchParams({ create: '1', title, artist }).toString()}`

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <Link href="/songs" className="text-sm text-muted-foreground hover:underline">
          ← Songs
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add Song</h1>
        <p className="text-sm text-muted-foreground">
          Search first: the song may already be in the shared catalog, with lyrics ready to use.
        </p>
      </div>

      <form method="get" className="mb-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required defaultValue={title} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="artist">Artist</Label>
            <Input id="artist" name="artist" defaultValue={artist} />
          </div>
        </div>
        <Button type="submit" className="min-h-[44px]">
          Search
        </Button>
      </form>

      {searched && (
        <section className="space-y-4" aria-label="Search results">
          {matches.length > 0 ? (
            <>
              <h2 className="text-lg font-semibold">Is it one of these?</h2>
              <CatalogMatchList matches={matches} />
            </>
          ) : (
            <p className="text-muted-foreground">No songs match &ldquo;{title.trim()}&rdquo;.</p>
          )}
          <Link href={createHref} className={buttonVariants({ variant: 'outline' }) + ' min-h-[44px]'}>
            {matches.length > 0 ? 'None of these: create a new song' : `Create “${title.trim()}”`}
          </Link>
        </section>
      )}
    </div>
  )
}
