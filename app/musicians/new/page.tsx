import Link from 'next/link'
import { MusicianForm } from '@/components/musicians/musician-form'
import { createMusician } from '../actions'

export default function NewMusicianPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-6">
        <Link href="/musicians" className="text-sm text-muted-foreground hover:underline">
          ← Musicians
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add Musician</h1>
      </div>
      <MusicianForm action={createMusician} />
    </div>
  )
}
