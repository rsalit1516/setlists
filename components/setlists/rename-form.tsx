'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { renameSetlist } from '@/app/setlists/actions'

export function RenameForm({ id, currentName }: { id: string; currentName: string }) {
  const [editing, setEditing] = useState(false)
  const [state, formAction, pending] = useActionState(renameSetlist, null)

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex items-center gap-2 text-left"
      >
        <h1 className="text-2xl font-bold">{currentName}</h1>
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
          ✎ rename
        </span>
      </button>
    )
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Input
        name="name"
        defaultValue={currentName}
        autoFocus
        className="text-xl font-bold h-9 w-64"
      />
      <Button type="submit" size="sm" disabled={pending}>Save</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </form>
  )
}
