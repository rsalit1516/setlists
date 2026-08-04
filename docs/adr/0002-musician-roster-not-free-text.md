# 2. Musician roster, not free text

## Status

Accepted. The `amountPaid`/`paidAt` → `share` swap described below was superseded by
[0003](0003-restore-per-musician-amount-paid-and-date.md) — the roster-vs-free-text decision
itself stands.

## Context

`GigMusician.name` (issue #27) was free text — `addMusician` in `app/gigs/actions.ts` just
wrote whatever string was typed into a gig's musician list. That meant no shared identity
across gigs: the same person shows up as differently-spelled strings depending on who typed
what, there's no way to build a reusable "band roster," and there's no stable id to hang
future work on (e.g. per-musician payout tracking).

## Decision

Add a `Musician` model as the single source of truth for people who can be assigned to gigs,
and make `GigMusician.musicianId` a required foreign key to it — **no free-text fallback**,
including for one-off subs and guests. Anyone who plays a gig, regular or not, must exist in
the roster first. `@@unique([gigId, musicianId])` prevents adding the same musician to a gig
twice.

`createGig` auto-populates each new gig with the 4 canonical default band members (looked up
by name against the roster at creation time), so the common case needs no manual roster
picking — they're just as removable/addable as any other roster pick afterward.

Existing data was migrated in two steps rather than one, since real gig history had to be
preserved:

1. **Additive migration**: create `Musician`; add a nullable `musicianId` column to
   `GigMusician` alongside the existing `name` column. Backfill inserts one `Musician` row per
   distinct existing `GigMusician.name` value (exact-string match), points existing
   `GigMusician` rows at the matching `Musician` via that same match, then seeds the 4
   canonical defaults if not already present.
2. **Finalize migration**, applied only after verifying the backfill: drop `name` (plus the
   then-unused `amountPaid`/`paidAt` columns — swapped for a `share` column added in step 1,
   since every existing value was `NULL`), make `musicianId` required, add the
   `@@unique([gigId, musicianId])` constraint.

Backfill matching is exact-string only — historical nicknames/typos would become separate
`Musician` rows if any existed. In this dataset, none did (all 4 existing `GigMusician.name`
values matched the canonical defaults exactly). If divergence surfaces later, cleanup happens
through the `/musicians` roster page, not automatically.

## Consequences

- Every gig's musician list is now a set of roster picks, not strings — renaming a musician on
  the roster page updates their name everywhere they've played, instead of requiring an edit
  per gig.
- Adding a musician to a gig requires them to exist on the roster first; there is deliberately
  no "just type a name" escape hatch, even for a single guest sit-in.
- `amountPaid`/`paidAt` per-musician payment tracking was removed in favor of `share` (a
  payout-share amount), matching how the field was defined before a short-lived reversal the
  day before this change. No manual reconciliation was needed since every existing value was
  `NULL`.
