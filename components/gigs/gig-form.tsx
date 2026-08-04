'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { GigActionState } from '@/app/gigs/actions'
import type { GigWithDetails, Venue } from '@/lib/types'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const textareaClass =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none'

type FormAction = (state: GigActionState, formData: FormData) => Promise<GigActionState>

export function GigForm({
  venues,
  gig,
  action,
  defaultSetlistId,
}: {
  venues: Venue[]
  gig?: GigWithDetails
  action: FormAction
  defaultSetlistId?: string
}) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-4">
      {gig && <input type="hidden" name="id" value={gig.id} />}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      {!gig && defaultSetlistId && (
        <input type="hidden" name="setlistId" value={defaultSetlistId} />
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Date</label>
        <Input
          type="date"
          name="date"
          required
          defaultValue={gig ? new Date(gig.date).toISOString().slice(0, 10) : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Start Time</label>
          <Input
            type="time"
            name="startTime"
            defaultValue={gig?.startTime ?? ''}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">End Time</label>
          <Input
            type="time"
            name="endTime"
            defaultValue={gig?.endTime ?? ''}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Venue</label>
        <select
          name="venueId"
          required
          title="Venue"
          defaultValue={gig?.venueId ?? ''}
          className={selectClass}
        >
          <option value="">Select venue…</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      {!gig && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="createSetlist"
            name="createSetlist"
            value="true"
            defaultChecked={!defaultSetlistId}
          />
          <label htmlFor="createSetlist" className="cursor-pointer text-sm font-medium">
            Create setlist
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Amount Contracted ($)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            name="amountContracted"
            placeholder="0.00"
            defaultValue={gig?.amountContracted ?? ''}
          />
        </div>
        {gig && (
          <div>
            <label className="mb-1 block text-sm font-medium">Amount Paid ($)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              name="amountPaid"
              placeholder="0.00"
              defaultValue={gig.amountPaid ?? ''}
            />
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <textarea
          name="notes"
          rows={3}
          className={textareaClass}
          placeholder="Optional notes…"
          defaultValue={gig?.notes ?? ''}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? (gig ? 'Saving…' : 'Creating…') : gig ? 'Save Changes' : 'Create Gig'}
        </Button>
        <Link href={gig ? `/gigs/${gig.id}` : '/gigs'} className={buttonVariants({ variant: 'ghost' })}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
