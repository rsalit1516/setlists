// Inline bar for the Most Played row — width is a runtime percentage of the
// list's max count, which Tailwind can't express as a static class, so it's
// set via style same as the preflight progress bar in performance-view.tsx.
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-accent-1-foreground" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-[22px] shrink-0 text-right text-[12.5px] tabular-nums text-muted-foreground">
        {value}
      </span>
    </div>
  )
}
