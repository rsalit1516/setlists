'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addItem } from '@/app/setlists/actions'
import type { Song, SetSection } from '@/lib/types'

function formatSongLabel(s: Song): string {
  return `${s.title}${s.artist ? ` — ${s.artist}` : ''}`
}

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
  const [songId, setSongId] = useState<string | null>(null)
  const available = songs.filter((s) => !existingIds.has(s.id))

  if (available.length === 0) return null

  async function handleSubmit(formData: FormData) {
    await addItem(formData)
    setSongId(null)
  }

  return (
    <form action={handleSubmit} className="flex gap-2 pt-1">
      <input type="hidden" name="setlistId" value={setlistId} />
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="setNumber" value={setNumber} />
      <Select name="songId" required value={songId} onValueChange={setSongId}>
        <SelectTrigger aria-label="Song to add" className="h-8 flex-1">
          <SelectValue>
            {(value: string | null) => {
              const s = available.find((song) => song.id === value)
              return s ? formatSongLabel(s) : 'Add a song…'
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {available.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {formatSongLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" variant="outline">
        Add
      </Button>
    </form>
  )
}
