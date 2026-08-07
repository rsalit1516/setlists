import { cn } from '@/lib/utils'

// tone reuses the app's existing semantic tokens rather than one-off colors:
// key (green) mirrors success-pill; stale (amber) is the day-count badge
// added for #38; danger (red) mirrors the financials/negative-amount pairing
// already used for the Outstanding Balance stat card.
const toneClasses = {
  key: 'bg-success-pill text-success-pill-foreground',
  stale: 'bg-stale-pill text-stale-pill-foreground',
  danger: 'bg-financials text-negative-amount',
} as const

export function Pill({
  tone,
  className,
  children,
}: {
  tone: keyof typeof toneClasses
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-[9px] py-[3px] text-xs font-semibold',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
