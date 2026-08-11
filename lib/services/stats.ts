import prisma from '@/lib/db'
import { getSongs } from '@/lib/services/songs'
import type {
  MostPlayedSong,
  ReadySongNeverPlayed,
  StaleReadySong,
  StaleInProgressSong,
  UnpaidGig,
  ScheduleGap,
  ScheduleGapSide,
} from '@/lib/types'

export const DEFAULT_STALE_GIG_WINDOW = 10
export const DEFAULT_STALE_DAYS_THRESHOLD = 60
export const DEFAULT_GAP_LOOKAHEAD_MONTHS = 6
export const DEFAULT_GAP_DAYS = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

// Local to this file, matching the toStr() convention in lib/services/gigs.ts
// and lib/services/finance.ts — Decimal fields aren't JSON-serializable, so
// every service that reads them re-declares this rather than sharing one.
function toStr(d: unknown): string | null {
  if (d === null || d === undefined) return null
  return String(d)
}

function addMonths(d: Date, months: number): Date {
  const result = new Date(d)
  result.setMonth(result.getMonth() + months)
  return result
}

// Math.round (not floor) so `now`'s exact time-of-day doesn't shave a day off
// gaps measured against a gig's noon-hardcoded date.
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY)
}

// Shared join: a play only counts if the SetlistItem is active, was actually
// played, belongs to a Setlist attached to at least one active Gig (a
// Setlist with no Gig, e.g. a draft, never counts as a performance), and
// wasn't a Soundcheck run-through — soundcheck reps aren't performances in
// front of an audience, so they don't count as a "play." Both
// getMostPlayedSongs and getReadySongsNeverPlayed build on this same
// per-song count instead of re-deriving the join twice.
async function getPlayCountsBySongId(): Promise<Map<string, number>> {
  const rows = await prisma.setlistItem.findMany({
    where: {
      isActive: true,
      wasPlayed: true,
      section: { not: 'SOUNDCHECK' },
      setlist: { gig: { isActive: true } },
    },
    select: { songId: true },
  })

  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.songId, (counts.get(row.songId) ?? 0) + 1)
  }
  return counts
}

// Song is not filtered by isActive here — a play count is a historical fact
// even for a since-deactivated song.
export async function getMostPlayedSongs(limit = 10): Promise<MostPlayedSong[]> {
  const counts = await getPlayCountsBySongId()
  if (counts.size === 0) return []

  const songs = await prisma.song.findMany({
    where: { id: { in: Array.from(counts.keys()) } },
    select: { id: true, title: true, artist: true },
  })

  return songs
    .map((s) => ({ songId: s.id, title: s.title, artist: s.artist, playCount: counts.get(s.id)! }))
    .sort((a, b) => b.playCount - a.playCount || a.title.localeCompare(b.title))
    .slice(0, limit)
}

export async function getReadySongsNeverPlayed(): Promise<ReadySongNeverPlayed[]> {
  const [counts, readySongs] = await Promise.all([getPlayCountsBySongId(), getSongs('READY')])

  // getSongs orders by title asc already — filtering preserves that order.
  return readySongs
    .filter((s) => !counts.has(s.id))
    .map((s) => ({ songId: s.id, title: s.title, artist: s.artist, key: s.key }))
}

// Distinct from getPlayCountsBySongId: that helper counts plays at ANY active
// gig, all-time, with no ordering. This one needs the opposite shape — which
// active PAST gig (date <= now) each song was most recently played at, so we
// can tell "played, but not within the last N gigs" apart from "never
// played." Built gig-first (not setlistItem-first) so iteration order over
// gigs (most-recent-first) doubles as each song's "gigs since last played."
// Soundcheck items are excluded for the same reason as getPlayCountsBySongId
// — a soundcheck run-through isn't a real performance.
async function getGigsSinceLastPlayedBySongId(): Promise<Map<string, number>> {
  const gigs = await prisma.gig.findMany({
    where: { isActive: true, date: { lte: new Date() } },
    orderBy: { date: 'desc' },
    select: {
      setlist: {
        select: {
          items: {
            where: { isActive: true, wasPlayed: true, section: { not: 'SOUNDCHECK' } },
            select: { songId: true },
          },
        },
      },
    },
  })

  const gigsSinceLastPlayed = new Map<string, number>()
  gigs.forEach((gig, gigIndex) => {
    for (const item of gig.setlist.items) {
      if (!gigsSinceLastPlayed.has(item.songId)) {
        gigsSinceLastPlayed.set(item.songId, gigIndex)
      }
    }
  })
  return gigsSinceLastPlayed
}

// Sorted by gigs since last played descending; never-played songs are
// treated as infinitely stale and sort first (gigsSinceLastPlayed: null),
// ahead of songs merely last played before the window.
export async function getStaleReadySongs(
  gigWindow = DEFAULT_STALE_GIG_WINDOW
): Promise<StaleReadySong[]> {
  const [gigsSinceLastPlayed, readySongs] = await Promise.all([
    getGigsSinceLastPlayedBySongId(),
    getSongs('READY'),
  ])

  return readySongs
    .map((s) => ({
      songId: s.id,
      title: s.title,
      artist: s.artist,
      key: s.key,
      gigsSinceLastPlayed: gigsSinceLastPlayed.get(s.id) ?? null,
    }))
    .filter((s) => s.gigsSinceLastPlayed === null || s.gigsSinceLastPlayed >= gigWindow)
    .sort((a, b) => {
      if (a.gigsSinceLastPlayed === null || b.gigsSinceLastPlayed === null) {
        if (a.gigsSinceLastPlayed === b.gigsSinceLastPlayed) return a.title.localeCompare(b.title)
        return a.gigsSinceLastPlayed === null ? -1 : 1
      }
      return b.gigsSinceLastPlayed - a.gigsSinceLastPlayed || a.title.localeCompare(b.title)
    })
}

// `updatedAt` bumps on any field edit, not specifically a status change — this
// is a proxy for "untouched," not a precise "time spent In Progress." No
// dedicated statusChangedAt field, by design (decided with the user).
// `now` is injectable so tests don't depend on the real clock; callers omit it.
export async function getStaleInProgressSongs(
  daysThreshold = DEFAULT_STALE_DAYS_THRESHOLD,
  now: Date = new Date()
): Promise<StaleInProgressSong[]> {
  const cutoff = new Date(now.getTime() - daysThreshold * MS_PER_DAY)
  const songs = await getSongs('IN_PROGRESS')

  return songs
    .filter((s) => s.updatedAt <= cutoff)
    .map((s) => ({
      songId: s.id,
      title: s.title,
      artist: s.artist,
      daysSinceUpdate: Math.floor((now.getTime() - s.updatedAt.getTime()) / MS_PER_DAY),
    }))
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
}

// Column-to-column comparison (amountPaid < amountContracted) isn't
// expressible in a Prisma `where` without raw SQL, so the "owed" filter runs
// in JS after fetching active past gigs that have a contracted amount.
// `now` is injectable so tests don't depend on the real clock; callers omit it.
export async function getUnpaidGigs(now: Date = new Date()): Promise<UnpaidGig[]> {
  const rows = await prisma.gig.findMany({
    where: {
      isActive: true,
      date: { lte: now },
      amountContracted: { not: null },
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      date: true,
      amountContracted: true,
      amountPaid: true,
      venue: { select: { name: true } },
    },
  })

  return rows
    .map((r) => {
      const amountContracted = toStr(r.amountContracted)!
      const amountPaid = toStr(r.amountPaid)
      const paid = amountPaid ? parseFloat(amountPaid) : 0
      const outstandingBalance = parseFloat(amountContracted) - paid
      return {
        id: r.id,
        date: r.date,
        venueName: r.venue.name,
        amountContracted,
        amountPaid,
        outstandingBalance,
        paidStatus: (paid === 0 ? 'unpaid' : 'partial') as UnpaidGig['paidStatus'],
      }
    })
    .filter((g) => g.outstandingBalance > 0)
}

// Walks active upcoming gigs (today through the lookahead window) in date
// order, flagging any stretch longer than gapDays — including the leading
// stretch from "today" to the first gig, and a trailing open-ended stretch
// if nothing is scheduled between the last known gig and the end of the
// window (or between today and the window end, if nothing is scheduled at
// all). That trailing check is unconditional, so a fully-empty window is
// naturally caught by the same logic rather than needing a special case.
// `now` is injectable so tests don't depend on the real clock; callers omit it.
export async function getScheduleGaps(
  lookaheadMonths = DEFAULT_GAP_LOOKAHEAD_MONTHS,
  gapDays = DEFAULT_GAP_DAYS,
  now: Date = new Date()
): Promise<ScheduleGap[]> {
  const windowEnd = addMonths(now, lookaheadMonths)

  const gigs = await prisma.gig.findMany({
    where: { isActive: true, date: { gte: now, lte: windowEnd } },
    orderBy: { date: 'asc' },
    select: { id: true, date: true, venue: { select: { name: true } } },
  })

  const gaps: ScheduleGap[] = []
  let prevDate = now
  let prevSide: ScheduleGapSide = { type: 'today' }

  for (const gig of gigs) {
    const gigSide: ScheduleGapSide = {
      type: 'gig',
      gigId: gig.id,
      venueName: gig.venue.name,
      date: gig.date,
    }
    const gap = daysBetween(prevDate, gig.date)
    if (gap > gapDays) {
      gaps.push({ from: prevSide, to: gigSide, days: gap })
    }
    prevDate = gig.date
    prevSide = gigSide
  }

  const trailingGap = daysBetween(prevDate, windowEnd)
  if (trailingGap > gapDays) {
    gaps.push({ from: prevSide, to: { type: 'open' }, days: trailingGap })
  }

  return gaps
}

// For the dashboard's "Next Schedule Gap" metric card: how many days from now
// until the schedule opens up, derived from the list getScheduleGaps already
// computed rather than re-querying. gaps[0] is the earliest gap chronologically
// (the list is built by walking gigs in ascending date order) — its `from`
// side is either 'today' (a gap is open right now, 0 days out) or the gig
// immediately preceding it. Returns null when there's no gap in the window.
// `now` is injectable so tests don't depend on the real clock; callers omit it.
export function getNextGapDaysOut(gaps: ScheduleGap[], now: Date = new Date()): number | null {
  const next = gaps[0]
  if (!next) return null
  if (next.from.type === 'today') return 0
  if (next.from.type === 'gig') return daysBetween(now, next.from.date)
  return null
}
