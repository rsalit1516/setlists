'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { addItem } from '@/app/setlists/actions'
import type { Song, SetSection } from '@/lib/types'

export function AddSongForm({
  setlistId,
  section,
  setNumber,
  songs,
  existingIds,
}: {
  setlistId: string
  section: SetSection
  setNumber: number
  songs: Song[]
  existingIds: Set<string>
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const available = songs.filter((s) => !existingIds.has(s.id))

  if (available.length === 0) return null

  async function handleSubmit(formData: FormData) {
    await addItem(formData)
    formRef.current?.reset()
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex gap-2 pt-1">
      <input type="hidden" name="setlistId" value={setlistId} />
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="setNumber" value={setNumber} />
      <select
        name="songId"
        title="Song to add"
        required
        className="flex h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        defaultValue=""
      >
        <option value="" disabled>
          Add a song…
        </option>
        {available.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}{s.artist ? ` — ${s.artist}` : ''}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline">
        Add
      </Button>
    </form>
  )
}
