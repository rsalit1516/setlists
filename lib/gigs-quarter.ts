import { addMonths, getMonthRange } from '@/lib/gigs-month'

// Pure Date math for the gigs Quarter-strip view — sibling to gigs-month.ts,
// built on its addMonths/getMonthRange instead of duplicating them. The
// `anchorMonth` is always the strip's first month; `?quarter=YYYY-MM` in the
// URL is parsed with gigs-month's parseMonthParam since the param shares its
// format.

// The three months the strip displays, in order. addMonths(anchorMonth, 0)
// normalizes the first entry to the 1st the same way it already does for the
// other two, so callers don't have to pre-normalize anchorMonth themselves.
export function getQuarterMonths(anchorMonth: Date): Date[] {
  return [addMonths(anchorMonth, 0), addMonths(anchorMonth, 1), addMonths(anchorMonth, 2)]
}

// Half-open [start, end) covering all three months — matches getGigsInRange's
// `gte`/`lt` bounds, fetched in one query for the whole strip.
export function getQuarterRange(anchorMonth: Date): { start: Date; end: Date } {
  return {
    start: getMonthRange(anchorMonth).start,
    end: getMonthRange(addMonths(anchorMonth, 2)).end,
  }
}

// e.g. "Jul – Sep 2026", or "Nov 2025 – Jan 2026" when the window crosses a
// year boundary.
export function formatQuarterHeading(anchorMonth: Date): string {
  const endMonth = addMonths(anchorMonth, 2)
  const startLabel = anchorMonth.toLocaleDateString('en-US', { month: 'short' })
  const endLabel = endMonth.toLocaleDateString('en-US', { month: 'short' })
  const startYear = anchorMonth.getFullYear()
  const endYear = endMonth.getFullYear()

  return startYear === endYear
    ? `${startLabel} – ${endLabel} ${endYear}`
    : `${startLabel} ${startYear} – ${endLabel} ${endYear}`
}
