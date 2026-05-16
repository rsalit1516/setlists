'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { VenueActionState } from '@/app/venues/actions'
import type { Venue } from '@/lib/types'

type FormAction = (state: VenueActionState, formData: FormData) => Promise<VenueActionState>

export function VenueForm({ venue, action }: { venue?: Venue; action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-5">
      {venue && <input type="hidden" name="id" value={venue.id} />}

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" required defaultValue={venue?.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={venue?.address ?? ''} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={venue?.notes ?? ''}
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : venue ? 'Save Changes' : 'Add Venue'}
        </Button>
        <Link href="/venues" className={buttonVariants({ variant: 'outline' })}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
