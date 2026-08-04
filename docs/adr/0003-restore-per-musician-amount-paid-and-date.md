# 3. Restore per-musician `amountPaid`/`paidAt`, drop `share`

## Status

Accepted. Supersedes the `share` decision in [0002](0002-musician-roster-not-free-text.md)
(the roster-vs-free-text decision in 0002 is unaffected).

## Context

Issue #17 added `GigMusician.amountPaid`/`paidAt` for per-musician payout tracking. The very
next day, the musician-roster finalize migration (0002) dropped both in favor of a single
`share` column — a payout-*share* amount, with no paid-date. `share` was never wired into any
form or display; it stayed unused after that migration too.

Issue #19 (per-musician payment tracking + bulk mark-all-paid) needs:
- **when** each musician was actually paid, to derive a per-gig payout-status badge
  (all/some/none paid) and to know what a "mark all musicians paid" bulk action should stamp.
- **what was actually paid**, not a planned split — in practice these are usually the same
  number, but `amountPaid` is the one that answers "did this musician get paid."

A bare `share` column can express neither: it has no date, so "paid" can't be derived from it
at all.

## Decision

Drop `GigMusician.share`. Re-add `amountPaid Decimal?` and `paidAt DateTime?`, matching #17's
original shape. `musicianId` (the roster FK from 0002) is untouched.

## Consequences

- Per-musician paid status is derived from `paidAt IS NOT NULL` — no separate stored status
  field, consistent with how gig-level paid status already works (`Gig.paidAt`).
- If a future need for a distinct "planned split, not yet paid" value shows up, that's a
  separate field to add later — this change doesn't attempt to model it.
- `share` held no real data (confirmed unused in any form/view before removal), so the
  migration is a straight column swap with no backfill.
