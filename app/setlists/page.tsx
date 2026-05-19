import Link from 'next/link'
import { getSetlists } from '@/lib/services/setlists'
import { Button, buttonVariants } from '@/components/ui/button'
import { deleteSetlist } from './actions'

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function SetlistsPage() {
  const setlists = await getSetlists()

  const currentYear = new Date().getFullYear()

  // Group by year of gig date, falling back to createdAt
  const byYear = new Map<number, typeof setlists>()
  for (const sl of setlists) {
    const d = sl.gig?.date ?? sl.createdAt
    const year = new Date(d).getFullYear()
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(sl)
  }
  const years = [...byYear.keys()].sort((a, b) => b - a)

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
        <div className="space-y-1">
          {years.map((year) => {
            const items = byYear.get(year)!
            return (
              <details
                key={year}
                open={year === currentYear}
                className="group rounded-lg border"
              >
                <summary className="flex cursor-pointer select-none list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold">
                    {year}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {items.length} setlist{items.length !== 1 ? 's' : ''}
                    </span>
                  </span>
                  <span className="text-muted-foreground transition-transform duration-150 group-open:rotate-180">
                    ▾
                  </span>
                </summary>

                <ul className="divide-y border-t">
                  {items.map((sl) => {
                    const deleteAction = deleteSetlist.bind(null, sl.id)
                    return (
                      <li
                        key={sl.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/setlists/${sl.id}`}
                            className="font-medium hover:underline"
                          >
                            {sl.name}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                            {sl.gig ? (
                              <span>
                                {sl.gig.venue.name} · {formatDate(sl.gig.date)}
                              </span>
                            ) : (
                              <span>No gig linked</span>
                            )}
                            <span>
                              {sl._count.items} song{sl._count.items !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Link
                            href={`/setlists/${sl.id}`}
                            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                          >
                            Edit
                          </Link>
                          {!sl.gig && (
                            <form action={deleteAction}>
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                Delete
                              </Button>
                            </form>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}
