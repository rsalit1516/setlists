import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getGig } from '@/lib/services/gigs'
import { addExpense, removeExpense, addMusician, removeMusician } from '@/app/gigs/actions'
import { EditFinancialsForm } from '@/components/gigs/edit-financials-form'
import { buttonVariants } from '@/components/ui/button'

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-2">
        <Link href="/gigs" className="text-sm text-muted-foreground hover:underline">
          ← Gigs
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{formatDate(gig.date)}</h1>
        <p className="text-muted-foreground">{gig.venue.name}</p>
        <p className="mt-1 text-sm">
          Setlist:{' '}
          <Link href={`/setlists/${gig.setlist.id}`} className="underline hover:no-underline">
            {gig.setlist.name}
          </Link>
        </p>
        {gig.notes && (
          <p className="mt-2 text-sm text-muted-foreground">{gig.notes}</p>
        )}
      </div>

      {/* Financials */}
      <div className="mb-4 rounded-lg border">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Financials
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
            <span>{gig.amountPaid ? `${net < 0 ? '−' : ''}$${Math.abs(net).toFixed(2)}` : '—'}</span>
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
      <div className="mb-4 rounded-lg border">
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
                  <form action={removeAction}>
                    <button
                      type="submit"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove expense"
                    >
                      ×
                    </button>
                  </form>
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
                  <form action={removeAction}>
                    <button
                      type="submit"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove musician"
                    >
                      ×
                    </button>
                  </form>
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
  )
}
