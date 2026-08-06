'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GigActionState } from '@/app/gigs/actions'
import type { GigWithDetails } from '@/lib/types'

type FormAction = (state: GigActionState, formData: FormData) => Promise<GigActionState>

function toDateInputValue(d: Date | null) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

export function EditFinancialsForm({ gig, action }: { gig: GigWithDetails; action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={gig.id} />
      {/* Venue/date/setlist fields live on the Edit Gig form — carry them through
          unchanged since updateGig writes every field each submit. */}
      <input type="hidden" name="venueId" value={gig.venueId} />
      <input type="hidden" name="date" value={new Date(gig.date).toISOString().slice(0, 10)} />
      <input type="hidden" name="startTime" value={gig.startTime ?? ''} />
      <input type="hidden" name="endTime" value={gig.endTime ?? ''} />
      <input type="hidden" name="amountContracted" value={gig.amountContracted ?? ''} />
      <input type="hidden" name="notes" value={gig.notes ?? ''} />

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <label className="flex flex-col gap-1.5 text-[11.5px] text-muted-foreground">
          Paid by venue ($)
          <Input
            type="number"
            step="0.01"
            min="0"
            name="amountPaid"
            placeholder="0.00"
            defaultValue={gig.amountPaid ?? ''}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[11.5px] text-muted-foreground">
          Paid on
          <Input type="date" name="paidAt" defaultValue={toDateInputValue(gig.paidAt)} />
        </label>
        <label className="flex flex-col gap-1.5 text-[11.5px] text-muted-foreground">
          Tips ($)
          <Input
            type="number"
            step="0.01"
            min="0"
            name="tips"
            placeholder="0.00"
            defaultValue={gig.tips ?? ''}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[11.5px] text-muted-foreground">
          Other revenue ($)
          <Input
            type="number"
            step="0.01"
            min="0"
            name="otherRevenue"
            placeholder="0.00"
            defaultValue={gig.otherRevenue ?? ''}
          />
        </label>
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Save Financials'}
      </Button>
    </form>
  )
}
