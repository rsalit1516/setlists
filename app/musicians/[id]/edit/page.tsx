import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMusician } from '@/lib/services/musicians'
import { MusicianForm } from '@/components/musicians/musician-form'
import { updateMusician } from '../../actions'

export default async function EditMusicianPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const musician = await getMusician(id)

  if (!musician) notFound()

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-6">
        <Link href="/musicians" className="text-sm text-muted-foreground hover:underline">
          ← Musicians
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Edit Musician</h1>
      </div>
      <MusicianForm musician={musician} action={updateMusician} />
    </div>
  )
}
