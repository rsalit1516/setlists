export default function SetlistLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}
