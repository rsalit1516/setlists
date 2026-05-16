'use client'

import { useActionState, useEffect, useState } from 'react'
import { updateGig } from '@/app/gigs/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const textareaClass =
  'flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none'

export function EditFinancialsForm({
  id,
  amountContracted,
  amountPaid,
  notes,
}: {
  id: string
  amountContracted: string | null
  amountPaid: string | null
  notes: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [state, formAction, pending] = useActionState(updateGig, null)

  useEffect(() => {
    if (state && 'success' in state) setEditing(false)
  }, [state])

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-muted-foreground hover:underline"
      >
        ✎ Edit
      </button>
    )
  }

  return (
    <form action={formAction} className="mb-4 space-y-3">
      <input type="hidden" name="id" value={id} />
      {state && 'error' in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Contracted ($)</label>
          <Input
            name="amountContracted"
            type="number"
            step="0.01"
            min="0"
            defaultValue={amountContracted ?? ''}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Paid ($)</label>
          <Input
            name="amountPaid"
            type="number"
            step="0.01"
            min="0"
            defaultValue={amountPaid ?? ''}
            placeholder="0.00"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
        <textarea name="notes" rows={2} defaultValue={notes ?? ''} className={textareaClass} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </form>
  )
}
