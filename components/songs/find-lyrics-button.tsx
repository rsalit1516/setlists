'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { findLyrics } from '@/app/songs/actions'

const MESSAGES = {
  'no-match': 'No confident match found. Paste the lyrics in manually.',
  error: 'Lyrics lookup failed. Try again in a moment.',
} as const

export function FindLyricsButton({ songId }: { songId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    setMessage(null)
    startTransition(async () => {
      const { outcome } = await findLyrics(songId)
      if (outcome === 'imported') router.refresh()
      else setMessage(MESSAGES[outcome])
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" className="min-h-[44px]" disabled={pending} onClick={handleClick}>
        {pending ? 'Searching…' : 'Find lyrics'}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
