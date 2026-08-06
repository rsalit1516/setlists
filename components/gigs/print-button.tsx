'use client'

import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function PrintMenuItem() {
  return (
    <DropdownMenuItem onClick={() => window.print()}>
      Print Setlist
    </DropdownMenuItem>
  )
}
