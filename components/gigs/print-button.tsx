'use client'

import { buttonVariants } from '@/components/ui/button'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      Print Setlist
    </button>
  )
}
