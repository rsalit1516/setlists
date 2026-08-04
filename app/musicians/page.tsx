import Link from 'next/link'
import { getMusicians } from '@/lib/services/musicians'
import { buttonVariants } from '@/components/ui/button'
import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button'
import { deleteMusician } from './actions'

export default async function MusiciansPage() {
  const musicians = await getMusicians()

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Musicians</h1>
        <Link href="/musicians/new" className={buttonVariants()}>
          + Add Musician
        </Link>
      </div>

      {musicians.length === 0 ? (
        <p className="text-muted-foreground">No musicians yet. Add your first one!</p>
      ) : (
        <ul className="space-y-3">
          {musicians.map((musician) => {
            const deleteAction = deleteMusician.bind(null, musician.id)
            return (
              <li key={musician.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <p className="min-w-0 font-medium">{musician.name}</p>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/musicians/${musician.id}/edit`}
                    className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  >
                    Edit
                  </Link>
                  <DeleteConfirmButton
                    action={deleteAction}
                    description={`Remove "${musician.name}" from your roster?`}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
