// No 'use client' here — same reasoning as MusicianCheckboxList
// (components/gigs/musician-checkbox-list.tsx): plain checkboxes with no
// interactivity of their own need no client bundle, and SongForm (which has
// 'use client') picks this up for free once composed in.
export function GenreCheckboxList({
  genres,
  defaultCheckedIds,
}: {
  genres: { id: string; name: string }[]
  defaultCheckedIds: Set<string>
}) {
  if (genres.length === 0) {
    return <p className="text-sm text-muted-foreground">No genres yet — add one from the Genres directory.</p>
  }

  return (
    <div className="flex flex-col gap-1 sm:grid sm:grid-cols-2">
      {genres.map((genre) => (
        <label key={genre.id} className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="genreIds"
            value={genre.id}
            defaultChecked={defaultCheckedIds.has(genre.id)}
            className="size-4"
          />
          {genre.name}
        </label>
      ))}
    </div>
  )
}
