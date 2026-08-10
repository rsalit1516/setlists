import Link from 'next/link'
import { cn } from '@/lib/utils'
import { STALE_WINDOW_COOKIE, STALE_WINDOW_OPTIONS } from '@/lib/stale-window'

// Segmented control for the stale-ready window filter. Persisted via the
// shared /api/preferences cookie route (#56) so the choice survives leaving
// and returning to /stats — same pattern as components/songs/status-filter.tsx.
export function StaleWindowToggle({ active }: { active: number }) {
  return (
    <div className="flex gap-1.5">
      {STALE_WINDOW_OPTIONS.map((w) => (
        <Link
          key={w}
          href={`/api/preferences?cookie=${STALE_WINDOW_COOKIE}&value=${w}&redirect=${encodeURIComponent(`/stats?window=${w}#stale-ready`)}`}
          aria-current={Number(w) === active}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            Number(w) === active
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
