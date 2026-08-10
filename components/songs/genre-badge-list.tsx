// Genres are user-defined and open-ended, unlike the fixed SongStatus enum
// SongStatusBadge colors per value — so every genre badge shares one neutral
// style rather than a per-name color map.
export function GenreBadgeList({ genres }: { genres: { id: string; name: string }[] }) {
  if (genres.length === 0) return <span className="text-muted-foreground">—</span>

  return (
    <div className="flex flex-wrap gap-1">
      {genres.map((genre) => (
        <span
          key={genre.id}
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
        >
          {genre.name}
        </span>
      ))}
    </div>
  )
}
