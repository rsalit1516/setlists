'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GenreActionState } from '@/app/genres/actions'
import type { Genre } from '@/lib/types'

type FormAction = (state: GenreActionState, formData: FormData) => Promise<GenreActionState>

export function GenreForm({ genre, action }: { genre?: Genre; action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-5">
      {genre && <input type="hidden" name="id" value={genre.id} />}

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" required defaultValue={genre?.name} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : genre ? 'Save Changes' : 'Add Genre'}
        </Button>
        <Link href="/genres" className={buttonVariants({ variant: 'outline' })}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
