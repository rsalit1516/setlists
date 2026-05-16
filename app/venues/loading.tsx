export default function VenuesLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}
