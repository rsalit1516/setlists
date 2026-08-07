import { cn } from '@/lib/utils'

// Grid gap is 1px against a border-colored background, which shows through
// as hairline dividers between cards instead of drawing individual borders.
// min-w-0 is load-bearing: as a child of the page's flex column, this grid
// would otherwise refuse to shrink below its content's intrinsic width
// (flex items default to min-width:auto) and overflow the viewport on phones
// narrower than two 190px tracks instead of collapsing to one column.
export function StatStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-px overflow-hidden rounded-xl border bg-border">
      {children}
    </div>
  )
}

// Plain <a> (not next/link) — same-page hash anchor, not a route change.
export function StatCard({
  href,
  label,
  value,
  sub,
  tone = 'default',
}: {
  href: string
  label: string
  value: string | number
  sub?: string
  tone?: 'default' | 'danger'
}) {
  return (
    <a
      href={href}
      className={cn(
        'flex min-h-11 min-w-0 flex-col gap-2 px-5 py-5 transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring',
        tone === 'danger' ? 'bg-financials' : 'bg-card'
      )}
    >
      <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'font-heading text-[32px] font-bold leading-none',
          tone === 'danger' && 'text-negative-amount'
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </a>
  )
}
