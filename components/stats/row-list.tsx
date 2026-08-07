import { cn } from '@/lib/utils'

// Replaces the old boxed <Table> — plain rows, no header, hairline divider
// between rows via `divide-y`, subtle hover lightening. See issue #38.
export function RowList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col divide-y divide-border">{children}</div>
}

export function Row({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-11 items-center gap-3 px-1 py-2.5 transition-colors hover:bg-muted',
        className
      )}
    >
      {children}
    </div>
  )
}

export function RowTitle({
  title,
  subtitle,
}: {
  title: string
  subtitle?: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[14.5px] font-semibold">{title}</div>
      {subtitle && <div className="truncate text-[12.5px] text-muted-foreground">{subtitle}</div>}
    </div>
  )
}
