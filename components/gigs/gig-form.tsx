'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createGig } from '@/app/gigs/actions'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Venue } from '@/lib/types'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const textareaClass =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none'

export function GigForm({
  venues,
  defaultSetlistId,
}: {
  venues: Venue[]
  defaultSetlistId?: string
}) {
  const [state, formAction, pending] = useActionState(createGig, null)

  return (
    <form action={formAction} className="space-y-4">
      {state && 'error' in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {defaultSetlistId && <input type="hidden" name="setlistId" value={defaultSetlistId} />}

      <div>
        <label className="mb-1 block text-sm font-medium">Date</label>
        <Input type="date" name="date" required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Venue</label>
        <select name="venueId" required title="Venue" className={selectClass}>
          <option value="">Select venue…</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Amount Contracted ($)</label>
        <Input type="number" step="0.01" min="0" name="amountContracted" placeholder="0.00" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <textarea name="notes" rows={3} className={textareaClass} placeholder="Optional notes…" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create Gig'}
        </Button>
        <Link href="/gigs" className={buttonVariants({ variant: 'ghost' })}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
