export default function GigsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 h-8 w-24 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}
