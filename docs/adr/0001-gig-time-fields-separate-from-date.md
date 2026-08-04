# 1. Gig start/end time as fields separate from `date`

## Status

Accepted

## Context

Gigs needed a way to record start and end times (issue #26) so the gig detail
page can show a time range next to the date.

The `Gig.date` field is a `DateTime` that is deliberately hardcoded to noon
(`T12:00:00`) when created or edited (see `app/gigs/actions.ts`). It's treated
everywhere it's read — list sorting, `formatDate`, PDF generation — as a
calendar day, not a moment in time. Folding a real time-of-day into `date`
would change its meaning for every one of those call sites and risk
timezone-shift bugs (a gig entered as "7:00 PM" could round-trip to the wrong
calendar day depending on the reader's timezone).

## Decision

Add `startTime` and `endTime` as separate, nullable `String` columns on `Gig`,
storing `"HH:mm"` 24-hour values — exactly what a native
`<input type="time">` produces and consumes. `date` is untouched.

## Consequences

- `date` keeps its existing calendar-day-only meaning everywhere it's already
  used; no risk of regressing list sorting, `formatDate`, or PDF generation.
- Displaying a time range requires a small `formatTime("19:00") -> "7:00 PM"`
  helper on the gig detail page rather than relying on `Date` formatting.
- `startTime`/`endTime` are plain strings, not `Decimal`/`DateTime`, so they
  need no serialization handling in `lib/services/gigs.ts` (unlike the
  `Decimal` money fields, which do).
- Future work that needs actual duration math (breaks, set-time calculation)
  will have to combine `date` with `startTime`/`endTime` explicitly rather
  than reading a single timestamp — an intentional trade, deferred out of
  scope for this issue.
