'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSetlist } from '../actions'

export default function NewSetlistPage() {
  const [state, formAction, pending] = useActionState(createSetlist, null)

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6">
        <Link href="/setlists" className="text-sm text-muted-foreground hover:underline">
          ← Setlists
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New Setlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Give it a name — you'll add songs after.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        {state?.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="e.g. Saturday Night at the Fillmore"
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create Setlist'}
          </Button>
          <Link href="/setlists" className={buttonVariants({ variant: 'outline' })}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
