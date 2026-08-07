import Link from 'next/link'
import { cn } from '@/lib/utils'

const WINDOW_OPTIONS = [5, 10, 20] as const

// Segmented control for the stale-ready window filter. Still Link-driven
// (server-rendered, state lives in the ?window= query param) — just restyled
// as grouped pills instead of separate default/outline buttons.
export function StaleWindowToggle({ active }: { active: number }) {
  return (
    <div className="flex gap-1.5">
      {WINDOW_OPTIONS.map((w) => (
        <Link
          key={w}
          href={`/stats?window=${w}#stale-ready`}
          aria-current={w === active}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            w === active
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          )}
        >
          Last {w}
        </Link>
      ))}
    </div>
  )
}
