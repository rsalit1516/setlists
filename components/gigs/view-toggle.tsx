import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import type { GigsView } from '@/lib/types'

const VIEWS: { value: GigsView; label: string }[] = [
  { value: 'compact', label: 'Compact list' },
  { value: 'month', label: 'Month calendar' },
  { value: 'quarter', label: '3-month strip' },
]

export function ViewToggle({ current }: { current: GigsView }) {
  return (
    <nav aria-label="Gigs view" className="mb-6 flex flex-wrap gap-2">
      {VIEWS.map((v) => (
        <Link
          key={v.value}
          href={`/gigs/view?view=${v.value}`}
          aria-current={current === v.value ? 'page' : undefined}
          className={cn(
            buttonVariants({ variant: current === v.value ? 'default' : 'outline', size: 'sm' }),
            'h-11 px-4'
          )}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  )
}
