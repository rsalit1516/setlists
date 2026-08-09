import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getGig,
  calculateTotalExpenses,
  calculateGigNet,
  deriveMusicianPayoutStatus,
} from '@/lib/services/gigs'
import { getMusicians } from '@/lib/services/musicians'
import {
  addExpense,
  removeExpense,
  addMusician,
  removeMusician,
  updateGig,
  updateMusicianPayment,
  markAllMusiciansPaid,
} from '@/app/gigs/actions'
import { EditFinancialsForm } from '@/components/gigs/edit-financials-form'
import { PrintMenuItem } from '@/components/gigs/print-button'
import { buttonVariants, Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buildPrintLayout } from '@/lib/setlist-print'
import { toDateInputValue } from '@/lib/dates'
import type { GigSetlistItem } from '@/lib/types'

const inputClass =
  'flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (startTime && endTime) return `${formatTime(startTime)} – ${formatTime(endTime)}`
  if (startTime) return formatTime(startTime)
  if (endTime) return formatTime(endTime)
  return null
}

function fmt(amount: string | null) {
  if (!amount) return '—'
  return `$${parseFloat(amount).toFixed(2)}`
}

const PAYOUT_BADGE: Record<'all' | 'some' | 'none', { label: string; className: string }> = {
  all: {
    label: 'All musicians paid',
    className: 'border-transparent bg-success-pill text-success-pill-foreground',
  },
  some: {
    label: 'Some musicians paid',
    className: 'border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400',
  },
  none: {
    label: 'No musicians paid',
    className: 'border-border text-muted-foreground',
  },
}

function SongRow({ item, index }: { item: GigSetlistItem; index: number }) {
  return (
    <li className="flex items-baseline justify-between gap-2.5">
      <span className="truncate">
        <span className="mr-2 text-muted-foreground">{index}</span>
        {item.song.title}
      </span>
      {item.song.key && (
        <span className="shrink-0 font-semibold text-key-badge">{item.song.key}</span>
      )}
    </li>
  )
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
  const [gig, roster] = await Promise.all([getGig(id), getMusicians()])
  if (!gig) notFound()

  const addedMusicianIds = new Set(gig.musicians.map((m) => m.musicianId))
  const availableMusicians = roster.filter((m) => !addedMusicianIds.has(m.id))

  const totalExpenses = calculateTotalExpenses(gig.expenses)
  const net = calculateGigNet(gig, totalExpenses)
  const hasRevenue = Boolean(gig.amountPaid || gig.tips || gig.otherRevenue)
  const perMusician = gig.musicians.length > 0 ? net / gig.musicians.length : null
  const payoutStatus = deriveMusicianPayoutStatus(gig.musicians)
  const today = toDateInputValue(new Date())

  const { soundcheck, main, encore, numCols } = groupItems(gig.setlist.items)
  const columns = Array.from({ length: numCols }, (_, i) => i + 1)
  const printLayout = buildPrintLayout(gig.setlist.items)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">

      {/* ── Screen: back link ── */}
      <div className="mb-2.5 print:hidden">
        <Link
          href="/gigs"
          className="text-xs font-medium text-[oklch(65%_0.06_25)] hover:underline"
        >
          ← Gigs
        </Link>
      </div>

      {/* ── Screen: title block ── */}
      <div className="mb-6 print:hidden">
        <h1 className="font-heading text-[clamp(28px,4vw,38px)] font-bold leading-tight">
          {gig.venue.name}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {formatDate(gig.date)}
          {formatTimeRange(gig.startTime, gig.endTime) && (
            <span> · {formatTimeRange(gig.startTime, gig.endTime)}</span>
          )}
        </p>
        {gig.notes && (
          <p className="mt-1 text-sm text-muted-foreground">{gig.notes}</p>
        )}
      </div>

      {/* ── Screen: action bar ── */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3.5 border-b pb-5 print:hidden">
        <div className="flex flex-wrap items-center gap-5 text-[13.5px] font-medium">
          <Link href={`/gigs/${gig.id}/edit`} className="text-foreground hover:underline">
            Edit Gig
          </Link>
          <Link href={`/setlists/${gig.setlist.id}`} className="text-foreground hover:underline">
            Edit Setlist
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded-sm text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50">
              Export <span className="text-[10px]">▾</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[150px]">
              <PrintMenuItem />
              <DropdownMenuItem render={<a href={`/gigs/${gig.id}/pdf`} />}>
                Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Link
          href={`/gigs/${gig.id}/perform`}
          className="inline-flex h-9 items-center justify-center rounded-md border-[1.5px] border-primary px-4 text-[13px] font-semibold text-accent-1-foreground transition-colors hover:bg-primary/10"
        >
          Start Performance Mode
        </Link>
      </div>

      {/* ── Screen: setlist grid ── */}
      <div className="print:hidden">
        {gig.setlist.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No songs yet.{' '}
            <Link href={`/setlists/${gig.setlist.id}`} className="underline">
              Edit setlist
            </Link>
          </p>
        ) : (
          <>
            {/* Soundcheck above Set 1 */}
            {soundcheck.length > 0 && (
              <div className="mb-4 overflow-hidden rounded-lg border bg-card">
                <div className="px-4 pb-2 pt-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground">
                    Soundcheck
                  </span>
                </div>
                <ol className="flex flex-col gap-2 px-4 pb-4 text-[13.5px]">
                  {soundcheck.map((item, i) => (
                    <SongRow key={item.id} item={item} index={i + 1} />
                  ))}
                </ol>
              </div>
            )}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
              {columns.map((setNum) => {
                const setItems = main.filter((i) => i.setNumber === setNum)
                const isOdd = setNum % 2 === 1
                const borderAccent = isOdd ? 'border-t-primary' : 'border-t-accent-2'
                const textAccent = isOdd ? 'text-accent-1-foreground' : 'text-accent-2-foreground'
                return (
                  <details
                    key={setNum}
                    open
                    className={`overflow-hidden rounded-lg border border-t-[3px] bg-card ${borderAccent}`}
                  >
                    <summary
                      className={`flex list-none cursor-pointer items-center justify-between gap-2 px-4 pb-2.5 pt-3.5 [&::-webkit-details-marker]:hidden min-[860px]:pointer-events-none min-[860px]:cursor-default`}
                    >
                      <span className={`text-[11.5px] font-bold uppercase tracking-[.06em] ${textAccent}`}>
                        Set {setNum} · {setItems.length} Songs
                      </span>
                      <span aria-hidden className="text-[11px] text-muted-foreground min-[860px]:hidden">
                        ▾
                      </span>
                    </summary>
                    <ol className="flex flex-col gap-2 px-4 pb-4 text-[13.5px]">
                      {setItems.map((item, i) => (
                        <SongRow key={item.id} item={item} index={i + 1} />
                      ))}
                    </ol>

                    {/* Encore in the last card */}
                    {setNum === numCols && encore.length > 0 && (
                      <div className="px-4 pb-4">
                        <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[.05em] text-muted-foreground">
                          Encore
                        </div>
                        <ol className="flex flex-col gap-2 text-[13.5px]">
                          {encore.map((item, i) => (
                            <SongRow key={item.id} item={item} index={i + 1} />
                          ))}
                        </ol>
                      </div>
                    )}
                  </details>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Screen: financials ── */}
      <details
        id="financials"
        className="mt-10 overflow-hidden rounded-xl border border-financials-border bg-financials text-financials-foreground print:hidden"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="text-xs font-bold uppercase tracking-[.07em] text-[oklch(72%_0.1_30)]">
            Financials · Private
          </span>
          <span aria-hidden className="text-[11px] text-[oklch(60%_0.05_30)]">
            ▾
          </span>
        </summary>

        <div className="flex flex-col gap-6 px-5 pb-6">
          {/* Summary */}
          <div className="flex flex-col gap-2 border-b border-financials-border pb-4 text-[13.5px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contracted</span>
              <span>{fmt(gig.amountContracted)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid by venue</span>
              <span>{fmt(gig.amountPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tips</span>
              <span>{fmt(gig.tips)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Other revenue</span>
              <span>{fmt(gig.otherRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expenses</span>
              <span className={totalExpenses > 0 ? 'text-negative-amount' : ''}>
                {totalExpenses > 0 ? `–$${totalExpenses.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="flex justify-between pt-1 text-[15px] font-bold">
              <span>Net</span>
              <span>
                {hasRevenue ? `${net < 0 ? '−' : ''}$${Math.abs(net).toFixed(2)}` : '—'}
              </span>
            </div>
            {perMusician !== null && hasRevenue && (
              <div className="flex justify-between text-[12.5px] text-muted-foreground/80">
                <span>Suggested per musician ({gig.musicians.length})</span>
                <span>${perMusician.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Edit fields */}
          <EditFinancialsForm gig={gig} action={updateGig} />

          {/* Expenses */}
          <div className="flex flex-col gap-3 border-t border-financials-border pt-5">
            <span className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground">
              Expenses
            </span>
            {gig.expenses.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No expenses yet</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {gig.expenses.map((expense) => {
                  const removeAction = removeExpense.bind(null, expense.id)
                  return (
                    <li key={expense.id} className="flex items-center justify-between gap-2 text-[13.5px]">
                      <span>{expense.description}</span>
                      <span className="flex items-center gap-2.5">
                        <span className="tabular-nums">${parseFloat(expense.amount).toFixed(2)}</span>
                        <DeleteConfirmButton
                          action={removeAction}
                          variant="icon"
                          ariaLabel="Remove expense"
                          description={`Remove expense "${expense.description}"?`}
                        />
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            <form action={addExpense} className="flex flex-wrap gap-2.5">
              <input type="hidden" name="gigId" value={gig.id} />
              <input
                name="description"
                placeholder="Description"
                required
                className={`${inputClass} min-w-[160px] flex-1`}
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

          {/* Musicians */}
          <div className="flex flex-col gap-3.5 border-t border-financials-border pt-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground">
                Musicians
              </span>
              {payoutStatus && (
                <Badge variant="outline" className={PAYOUT_BADGE[payoutStatus].className}>
                  {PAYOUT_BADGE[payoutStatus].label}
                </Badge>
              )}
            </div>
            {gig.musicians.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No musicians added yet</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {gig.musicians.map((musician) => {
                  const removeAction = removeMusician.bind(null, musician.id)
                  const suggested = perMusician !== null ? perMusician.toFixed(2) : ''
                  return (
                    <li key={musician.id} className="flex flex-wrap items-center gap-2.5 text-[13.5px]">
                      <span className="min-w-[8rem] flex-1 font-semibold">{musician.musician.name}</span>
                      <form
                        action={updateMusicianPayment}
                        className="flex flex-wrap items-center gap-2.5"
                      >
                        <input type="hidden" name="gigMusicianId" value={musician.id} />
                        <Input
                          key={musician.amountPaid ?? suggested}
                          type="number"
                          step="0.01"
                          min="0"
                          name="amountPaid"
                          placeholder="0.00"
                          title={`Amount paid to ${musician.musician.name}`}
                          defaultValue={musician.amountPaid ?? suggested}
                          className="w-24"
                        />
                        <Input
                          key={toDateInputValue(musician.paidAt)}
                          type="date"
                          name="paidAt"
                          title={`Date paid to ${musician.musician.name}`}
                          defaultValue={toDateInputValue(musician.paidAt)}
                          className="w-[9.5rem]"
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Save
                        </Button>
                      </form>
                      <DeleteConfirmButton
                        action={removeAction}
                        variant="icon"
                        ariaLabel="Remove musician"
                        description={`Remove ${musician.musician.name} from this gig?`}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
            {gig.musicians.length > 0 && (
              <form
                action={markAllMusiciansPaid}
                className="flex flex-wrap items-end justify-between gap-3 border-t border-financials-border pt-4"
              >
                <input type="hidden" name="gigId" value={gig.id} />
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Paid on</label>
                  <Input type="date" name="paidAt" defaultValue={today} required className="w-[9.5rem]" />
                </div>
                <Button type="submit" size="sm">
                  Mark all musicians paid
                </Button>
              </form>
            )}
            {availableMusicians.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                All roster musicians already added
              </p>
            ) : (
              <form action={addMusician} className="flex gap-2.5">
                <input type="hidden" name="gigId" value={gig.id} />
                <select
                  name="musicianId"
                  required
                  title="Musician"
                  defaultValue=""
                  className={`${inputClass} flex-1`}
                >
                  <option value="" disabled>
                    Select musician…
                  </option>
                  {availableMusicians.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Add
                </button>
              </form>
            )}
          </div>
        </div>
      </details>

      {/* ── Print layout ── */}
      <div className="hidden print:block print-layout">
        {/* Venue + date header */}
        <div className="print-header">
          <div className="print-venue">{gig.venue.name}</div>
          <div className="print-date">{formatDate(gig.date)}</div>
        </div>

        {/* Set columns */}
        <div className={`print-columns print-columns-cols-${printLayout.columns.length}`}>
          {printLayout.columns.map((column, colIndex) => {
            const isFirst = colIndex === 0
            const isLast = colIndex === printLayout.columns.length - 1

            return (
              <div key={column.label} className="print-column">
                {/* Soundcheck (column 1 only) */}
                {isFirst && printLayout.soundcheck.length > 0 && (
                  <div className="print-sc-block">
                    <div className="print-sec-label-sm">Soundcheck</div>
                    {printLayout.soundcheck.map((song) => (
                      <div key={song.displayNumber} className="print-song-sm">
                        <span className="print-num-sm">{song.displayNumber}.</span>
                        <span>{song.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Set */}
                <div className="print-set-block">
                  <div className="print-sec-label">{column.label}</div>
                  {column.songs.map((song) => (
                    <div key={song.displayNumber} className="print-song">
                      <span className="print-num">{song.displayNumber}.</span>
                      <span>{song.title}</span>
                      {song.key && <span className="print-key">{song.key}</span>}
                    </div>
                  ))}
                </div>

                {/* Encore (last column only) */}
                {isLast && printLayout.encore.length > 0 && (
                  <div className="print-encore-block">
                    <div className="print-sec-label">Encore</div>
                    {printLayout.encore.map((song) => (
                      <div key={song.displayNumber} className="print-song">
                        <span className="print-num">{song.displayNumber}.</span>
                        <span>{song.title}</span>
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
