import Link from 'next/link'
import { getSetlists } from '@/lib/services/setlists'
import { Button, buttonVariants } from '@/components/ui/button'
import { deleteSetlist } from './actions'

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function SetlistsPage() {
  const setlists = await getSetlists()

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Setlists</h1>
        <Link href="/setlists/new" className={buttonVariants()}>
          + New Setlist
        </Link>
      </div>

      {setlists.length === 0 ? (
        <p className="text-muted-foreground">No setlists yet. Create your first one!</p>
      ) : (
        <ul className="space-y-3">
          {setlists.map((sl) => {
            const deleteAction = deleteSetlist.bind(null, sl.id)
            return (
              <li key={sl.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="min-w-0">
                  <Link href={`/setlists/${sl.id}`} className="font-medium hover:underline">
                    {sl.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                    {sl.gig ? (
                      <span>{sl.gig.venue.name} · {formatDate(sl.gig.date)}</span>
                    ) : (
                      <span>No gig linked</span>
                    )}
                    <span>{sl._count.items} song{sl._count.items !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/setlists/${sl.id}`}
                    className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  >
                    Edit
                  </Link>
                  <form action={deleteAction}>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      Delete
                    </Button>
                  </form>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
