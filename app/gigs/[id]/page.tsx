import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getGig } from '@/lib/services/gigs'
import { addExpense, removeExpense, addMusician, removeMusician } from '@/app/gigs/actions'
import { EditFinancialsForm } from '@/components/gigs/edit-financials-form'
import { PrintButton } from '@/components/gigs/print-button'
import { buttonVariants } from '@/components/ui/button'
import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button'
import type { GigSetlistItem } from '@/lib/types'

const inputClass =
  'flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmt(amount: string | null) {
  if (!amount) return '—'
  return `$${parseFloat(amount).toFixed(2)}`
}

function groupItems(items: GigSetlistItem[]) {
  const soundcheck = items.filter((i) => i.section === 'SOUNDCHECK')
  const main = items.filter((i) => i.section === 'MAIN')
  const encore = items.filter((i) => i.section === 'ENCORE')
  const maxSet = main.reduce((m, i) => Math.max(m, i.setNumber), 0)
  return { soundcheck, main, encore, numCols: Math.max(maxSet, 1) }
}

export default async function GigPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const gig = await getGig(id)
  if (!gig) notFound()

  const totalExpenses = gig.expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const paid = gig.amountPaid ? parseFloat(gig.amountPaid) : 0
  const net = paid - totalExpenses
  const perMusician = gig.musicians.length > 0 ? net / gig.musicians.length : null

  const { soundcheck, main, encore, numCols } = groupItems(gig.setlist.items)
  const columns = Array.from({ length: numCols }, (_, i) => i + 1)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">

      {/* ── Screen: back link ── */}
      <div className="mb-2 print:hidden">
        <Link href="/gigs" className="text-sm text-muted-foreground hover:underline">
          ← Gigs
        </Link>
      </div>

      {/* ── Screen: header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">{gig.venue.name}</h1>
          <p className="text-muted-foreground">{formatDate(gig.date)}</p>
          {gig.notes && (
            <p className="mt-1 text-sm text-muted-foreground">{gig.notes}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/setlists/${gig.setlist.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Edit Setlist
          </Link>
          <PrintButton />
          <a
            href="#financials"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Financials ↓
          </a>
        </div>
      </div>

      {/* ── Screen: setlist columns ── */}
      <div className="print:hidden">
        {gig.setlist.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No songs yet.{' '}
            <Link href={`/setlists/${gig.setlist.id}`} className="underline">
              Edit setlist
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row">
            {columns.map((setNum) => {
              const setItems = main.filter((i) => i.setNumber === setNum)
              return (
                <div key={setNum} className="min-w-0 flex-1 overflow-hidden rounded-lg border">
                  {/* Soundcheck above Set 1 */}
                  {setNum === 1 && soundcheck.length > 0 && (
                    <div className="border-b">
                      <div className="bg-muted/40 px-3 py-1.5">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Soundcheck
                        </h3>
                      </div>
                      <ol>
                        {soundcheck.map((item, i) => (
                          <li
                            key={item.id}
                            className="flex items-baseline gap-2 border-t px-3 py-1.5 text-sm first:border-t-0"
                          >
                            <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
                              {i + 1}
                            </span>
                            <span className="truncate">{item.song.title}</span>
                            {item.song.key && (
                              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                {item.song.key}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Set */}
                  <div className="bg-muted/40 px-3 py-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Set {setNum}
                      <span className="ml-1.5 font-normal">({setItems.length})</span>
                    </h3>
                  </div>
                  <ol>
                    {setItems.map((item, i) => (
                      <li
                        key={item.id}
                        className="flex items-baseline gap-2 border-t px-3 py-1.5 text-sm first:border-t-0"
                      >
                        <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="truncate">{item.song.title}</span>
                        {item.song.key && (
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                            {item.song.key}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>

                  {/* Encore in last column */}
                  {setNum === numCols && encore.length > 0 && (
                    <div className="border-t">
                      <div className="bg-muted/40 px-3 py-1.5">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Encore
                        </h3>
                      </div>
                      <ol>
                        {encore.map((item, i) => (
                          <li
                            key={item.id}
                            className="flex items-baseline gap-2 border-t px-3 py-1.5 text-sm first:border-t-0"
                          >
                            <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
                              {i + 1}
                            </span>
                            <span className="truncate">{item.song.title}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Screen: financials ── */}
      <div id="financials" className="mt-10 print:hidden space-y-4">
        <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wider">
          Financials
        </h2>

        {/* Summary */}
        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Summary
            </span>
            <EditFinancialsForm
              id={gig.id}
              amountContracted={gig.amountContracted}
              amountPaid={gig.amountPaid}
              notes={gig.notes}
            />
          </div>
          <div className="space-y-1 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contracted</span>
              <span>{fmt(gig.amountContracted)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>{fmt(gig.amountPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expenses</span>
              <span className={totalExpenses > 0 ? 'text-red-600 dark:text-red-400' : ''}>
                {totalExpenses > 0 ? `−$${totalExpenses.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1 font-medium">
              <span>Net</span>
              <span>
                {gig.amountPaid
                  ? `${net < 0 ? '−' : ''}$${Math.abs(net).toFixed(2)}`
                  : '—'}
              </span>
            </div>
            {perMusician !== null && gig.amountPaid && (
              <div className="flex justify-between text-muted-foreground">
                <span>Per musician ({gig.musicians.length})</span>
                <span>${perMusician.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expenses */}
        <div className="rounded-lg border">
          <div className="border-b bg-muted/40 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Expenses
            </span>
          </div>
          {gig.expenses.length === 0 ? (
            <p className="px-4 py-3 text-sm italic text-muted-foreground">No expenses yet</p>
          ) : (
            <ul className="divide-y">
              {gig.expenses.map((expense) => {
                const removeAction = removeExpense.bind(null, expense.id)
                return (
                  <li key={expense.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                    <span className="flex-1">{expense.description}</span>
                    <span className="tabular-nums text-muted-foreground">
                      ${parseFloat(expense.amount).toFixed(2)}
                    </span>
                    <DeleteConfirmButton
                      action={removeAction}
                      variant="icon"
                      ariaLabel="Remove expense"
                      description={`Remove expense "${expense.description}"?`}
                    />
                  </li>
                )
              })}
            </ul>
          )}
          <div className="px-4 pb-3 pt-2">
            <form action={addExpense} className="flex gap-2">
              <input type="hidden" name="gigId" value={gig.id} />
              <input
                name="description"
                placeholder="Description"
                required
                className={`${inputClass} flex-1`}
              />
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
                className={`${inputClass} w-24`}
              />
              <button
                type="submit"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Add
              </button>
            </form>
          </div>
        </div>

        {/* Musicians */}
        <div className="rounded-lg border">
          <div className="border-b bg-muted/40 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Musicians
            </span>
          </div>
          {gig.musicians.length === 0 ? (
            <p className="px-4 py-3 text-sm italic text-muted-foreground">No musicians added yet</p>
          ) : (
            <ul className="divide-y">
              {gig.musicians.map((musician) => {
                const removeAction = removeMusician.bind(null, musician.id)
                return (
                  <li key={musician.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                    <span className="flex-1 font-medium">{musician.name}</span>
                    {perMusician !== null && gig.amountPaid && (
                      <span className="tabular-nums text-muted-foreground">
                        ${perMusician.toFixed(2)}
                      </span>
                    )}
                    <DeleteConfirmButton
                      action={removeAction}
                      variant="icon"
                      ariaLabel="Remove musician"
                      description={`Remove ${musician.name} from this gig?`}
                    />
                  </li>
                )
              })}
            </ul>
          )}
          <div className="px-4 pb-3 pt-2">
            <form action={addMusician} className="flex gap-2">
              <input type="hidden" name="gigId" value={gig.id} />
              <input
                name="name"
                placeholder="Musician name"
                required
                className={`${inputClass} flex-1`}
              />
              <button
                type="submit"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Add
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Print layout ── */}
      <div className="hidden print:block print-layout">
        {/* Venue + date header */}
        <div className="print-header">
          <div className="print-venue">{gig.venue.name}</div>
          <div className="print-date">{formatDate(gig.date)}</div>
        </div>

        {/* Set columns */}
        <div className="print-columns">
          {columns.map((setNum) => {
            const setItems = main.filter((i) => i.setNumber === setNum)
            const isFirst = setNum === 1
            const isLast = setNum === numCols

            return (
              <div key={setNum} className="print-column">
                {/* Soundcheck (column 1 only) */}
                {isFirst && soundcheck.length > 0 && (
                  <div className="print-sc-block">
                    <div className="print-sec-label-sm">Soundcheck</div>
                    {soundcheck.map((item, i) => (
                      <div key={item.id} className="print-song-sm">
                        <span className="print-num-sm">{i + 1}.</span>
                        <span>{item.song.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Set */}
                <div className="print-set-block">
                  <div className="print-sec-label">Set {setNum}</div>
                  {setItems.map((item, i) => (
                    <div key={item.id} className="print-song">
                      <span className="print-num">{i + 1}.</span>
                      <span>{item.song.title}</span>
                      {item.song.key && (
                        <span className="print-key">{item.song.key}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Encore (last column only) */}
                {isLast && encore.length > 0 && (
                  <div className="print-encore-block">
                    <div className="print-sec-label">Encore</div>
                    {encore.map((item, i) => (
                      <div key={item.id} className="print-song">
                        <span className="print-num">{i + 1}.</span>
                        <span>{item.song.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
