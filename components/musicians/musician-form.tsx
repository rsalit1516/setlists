'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MusicianActionState } from '@/app/musicians/actions'
import type { Musician } from '@/lib/types'

type FormAction = (state: MusicianActionState, formData: FormData) => Promise<MusicianActionState>

export function MusicianForm({ musician, action }: { musician?: Musician; action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-5">
      {musician && <input type="hidden" name="id" value={musician.id} />}

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" required defaultValue={musician?.name} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : musician ? 'Save Changes' : 'Add Musician'}
        </Button>
        <Link href="/musicians" className={buttonVariants({ variant: 'outline' })}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
