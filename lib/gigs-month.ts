import type { GigSummary } from '@/lib/types'

// Pure Date math for the gigs Month calendar view — kept separate from
// lib/services/gigs.ts (top-level Prisma import) so this stays safe to import
// from anywhere without pulling in the Prisma client, mirroring gigs-view.ts.

// Shared with the Quarter strip's mini-calendars — kept here since this is
// the module both grid layouts already depend on.
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTH_PARAM_RE = /^(\d{4})-(\d{2})$/

// `YYYY-MM` -> first-of-month Date, or null if missing/malformed. Callers fall
// back to the real current month on null.
export function parseMonthParam(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = MONTH_PARAM_RE.exec(value)
  if (!match) return null
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return new Date(Number(match[1]), month - 1, 1)
}

export function formatMonthParam(monthDate: Date): string {
  return `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
}

export function addMonths(monthDate: Date, delta: number): Date {
  return new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1)
}

// Half-open [start, end) covering the whole month — matches getGigsInRange's
// `gte`/`lt` bounds.
export function getMonthRange(monthDate: Date): { start: Date; end: Date } {
  return {
    start: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
    end: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1),
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export type CalendarDay = {
  date: Date
  inCurrentMonth: boolean
  gigs: GigSummary[]
}

// Sun–Sat grid covering the full month, padded with leading/trailing days
// from adjacent months so every week row has 7 cells.
export function buildMonthGrid(monthDate: Date, gigs: GigSummary[]): CalendarDay[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay())
  const gridEnd = new Date(year, month, lastOfMonth.getDate() + (6 - lastOfMonth.getDay()))

  const days: CalendarDay[] = []
  for (const cursor = new Date(gridStart); cursor <= gridEnd; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor)
    days.push({
      date,
      inCurrentMonth: date.getMonth() === month,
      gigs: gigs.filter((g) => isSameDay(g.date, date)),
    })
  }
  return days
}
