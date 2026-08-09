'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MusicianCheckboxList } from '@/components/gigs/musician-checkbox-list'
import { syncGigMusicians } from '@/app/gigs/actions'
import { musicianPaymentLossWarning } from '@/lib/musician-payment-warning'
import { DEFAULT_MUSICIAN_NAMES } from '@/lib/musicians-defaults'
import type { GigActionState } from '@/app/gigs/actions'
import type { GigWithDetails, Musician, SetlistSummary, Venue } from '@/lib/types'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const textareaClass =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none'

function formatSetlistGigDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateInputValue(d: Date | null | undefined) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

type FormAction = (state: GigActionState, formData: FormData) => Promise<GigActionState>

export function GigForm({
  venues,
  setlists = [],
  musicians = [],
  gig,
  action,
  defaultSetlistId,
}: {
  venues: Venue[]
  setlists?: SetlistSummary[]
  musicians?: Musician[]
  gig?: GigWithDetails
  action: FormAction
  defaultSetlistId?: string
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const [setlistMode, setSetlistMode] = useState<'new' | 'copy'>(
    defaultSetlistId ? 'copy' : 'new'
  )

  // New Gig: pre-check the band's usual 4-piece lineup. Edit Gig: the
  // checklist below is a separate form/action entirely (see syncGigMusicians),
  // pre-checked from the gig's current roster instead.
  const defaultCheckedIds = gig
    ? new Set(gig.musicians.map((m) => m.musicianId))
    : new Set(musicians.filter((m) => DEFAULT_MUSICIAN_NAMES.includes(m.name)).map((m) => m.id))

  function getUncheckConfirmMessage(musicianId: string): string | null {
    const gm = gig?.musicians.find((m) => m.musicianId === musicianId)
    if (!gm) return null
    return musicianPaymentLossWarning(gm.musician.name, gm.amountPaid, gm.paidAt)
  }

  return (
    <>
      <form action={formAction} className="space-y-4">
        {gig && <input type="hidden" name="id" value={gig.id} />}

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium">Date</label>
          <Input
            type="date"
            name="date"
            required
            defaultValue={gig ? new Date(gig.date).toISOString().slice(0, 10) : undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Start Time</label>
            <Input
              type="time"
              name="startTime"
              defaultValue={gig?.startTime ?? ''}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">End Time</label>
            <Input
              type="time"
              name="endTime"
              defaultValue={gig?.endTime ?? ''}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Venue</label>
          <select
            name="venueId"
            required
            title="Venue"
            defaultValue={gig?.venueId ?? ''}
            className={selectClass}
          >
            <option value="">Select venue…</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {!gig && (
          <div>
            <label className="mb-1 block text-sm font-medium">Setlist</label>
            {setlists.length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  A new setlist will be created for this gig.
                </p>
                <input type="hidden" name="createSetlist" value="true" />
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="setlistMode"
                      checked={setlistMode === 'new'}
                      onChange={() => setSetlistMode('new')}
                      className="size-4"
                    />
                    Create new setlist
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="setlistMode"
                      checked={setlistMode === 'copy'}
                      onChange={() => setSetlistMode('copy')}
                      className="size-4"
                    />
                    Copy an existing setlist
                  </label>
                </div>

                {setlistMode === 'new' ? (
                  <input type="hidden" name="createSetlist" value="true" />
                ) : (
                  <select
                    name="setlistId"
                    required
                    title="Setlist"
                    defaultValue={defaultSetlistId ?? ''}
                    className={`${selectClass} mt-2`}
                  >
                    <option value="" disabled>
                      Select setlist to copy…
                    </option>
                    {setlists.map((sl) => (
                      <option key={sl.id} value={sl.id}>
                        {sl.name} — {sl._count.items} song{sl._count.items !== 1 ? 's' : ''}
                        {sl.gig ? ` · ${sl.gig.venue.name}, ${formatSetlistGigDate(sl.gig.date)}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Amount Contracted ($)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            name="amountContracted"
            placeholder="0.00"
            defaultValue={gig?.amountContracted ?? ''}
          />
        </div>

        {/* Also editable on the gig detail page's Financials section (EditFinancialsForm) —
            updateGig/createGig write every field each submit, so each form carries the
            other's fields through as hidden passthrough where it doesn't render them itself. */}
        <div className="border-t pt-4">
          <h2 className="mb-3 text-sm font-semibold">Financials</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Paid by venue ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                name="amountPaid"
                placeholder="0.00"
                defaultValue={gig?.amountPaid ?? ''}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Paid on</label>
              <Input type="date" name="paidAt" defaultValue={toDateInputValue(gig?.paidAt)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tips ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                name="tips"
                placeholder="0.00"
                defaultValue={gig?.tips ?? ''}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Other revenue ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                name="otherRevenue"
                placeholder="0.00"
                defaultValue={gig?.otherRevenue ?? ''}
              />
            </div>
          </div>
        </div>

        {/* New Gig only: selections travel with the single Create Gig submit
            below, since there's no gig ID yet to bind a separate action to.
            Edit Gig gets its own Musicians section (see below) instead. */}
        {!gig && (
          <div className="border-t pt-4">
            <h2 className="mb-3 text-sm font-semibold">Musicians</h2>
            <MusicianCheckboxList musicians={musicians} defaultCheckedIds={defaultCheckedIds} />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className={textareaClass}
            placeholder="Optional notes…"
            defaultValue={gig?.notes ?? ''}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (gig ? 'Saving…' : 'Creating…') : gig ? 'Save Changes' : 'Create Gig'}
          </Button>
          <Link href={gig ? `/gigs/${gig.id}` : '/gigs'} className={buttonVariants({ variant: 'ghost' })}>
            Cancel
          </Link>
        </div>
      </form>

      {/* Edit Gig only: a separate form/action (syncGigMusicians) so checking or
          unchecking a musician applies immediately, independent of Save Changes
          above. Payment entry per musician stays exclusively on the gig detail page. */}
      {gig && (
        <form action={syncGigMusicians} className="mt-4 border-t pt-4">
          <input type="hidden" name="gigId" value={gig.id} />
          <h2 className="mb-3 text-sm font-semibold">Musicians</h2>
          <MusicianCheckboxList
            musicians={musicians}
            defaultCheckedIds={defaultCheckedIds}
            getConfirmMessage={getUncheckConfirmMessage}
          />
          <Button type="submit" variant="outline" size="sm" className="mt-3">
            Update Musicians
          </Button>
        </form>
      )}
    </>
  )
}
