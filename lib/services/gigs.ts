import prisma from '@/lib/db'
import type { GigSummary, GigWithDetails, GigPerformanceData, GigMusician, GigMonthGroup } from '@/lib/types'
import { sanitizeLyricsHtml } from '@/lib/services/sanitize-lyrics'

function toStr(d: unknown): string | null {
  if (d === null || d === undefined) return null
  return String(d)
}

export function calculateTotalExpenses(expenses: { amount: string }[]): number {
  return expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
}

// Net = everything the band actually received for the gig, minus what it spent.
// Musician payouts aren't subtracted here — they're paid out of this net, not on top of it.
export function calculateGigNet(
  gig: { amountPaid: string | null; tips: string | null; otherRevenue: string | null },
  totalExpenses: number
): number {
  const paid = gig.amountPaid ? parseFloat(gig.amountPaid) : 0
  const tips = gig.tips ? parseFloat(gig.tips) : 0
  const other = gig.otherRevenue ? parseFloat(gig.otherRevenue) : 0
  return paid + tips + other - totalExpenses
}

export type MusicianPayoutStatus = 'all' | 'some' | 'none'

// Derived, never stored — per #19, a gig's musician-payout status always comes
// from each GigMusician's paidAt, not a separate gig-level column.
export function deriveMusicianPayoutStatus(
  musicians: Pick<GigMusician, 'paidAt'>[]
): MusicianPayoutStatus | null {
  if (musicians.length === 0) return null
  const paidCount = musicians.filter((m) => m.paidAt !== null).length
  if (paidCount === 0) return 'none'
  if (paidCount === musicians.length) return 'all'
  return 'some'
}

export async function getGigs(): Promise<GigSummary[]> {
  const rows: any[] = await prisma.gig.findMany({
    where: { isActive: true },
    orderBy: { date: 'desc' },
    include: {
      venue: { select: { name: true } },
      setlist: { select: { name: true } },
      _count: { select: { musicians: { where: { isActive: true } } } },
    },
  })
  return rows.map((r) => ({
    ...r,
    amountContracted: toStr(r.amountContracted),
    amountPaid: toStr(r.amountPaid),
    tips: toStr(r.tips),
    otherRevenue: toStr(r.otherRevenue),
  }))
}

// Half-open range [start, end) — used by the Month calendar view so it only
// queries the visible month instead of the full gig history.
export async function getGigsInRange(start: Date, end: Date): Promise<GigSummary[]> {
  const rows: any[] = await prisma.gig.findMany({
    where: { isActive: true, date: { gte: start, lt: end } },
    orderBy: { date: 'asc' },
    include: {
      venue: { select: { name: true } },
      setlist: { select: { name: true } },
      _count: { select: { musicians: { where: { isActive: true } } } },
    },
  })
  return rows.map((r) => ({
    ...r,
    amountContracted: toStr(r.amountContracted),
    amountPaid: toStr(r.amountPaid),
    tips: toStr(r.tips),
    otherRevenue: toStr(r.otherRevenue),
  }))
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Buckets already-ordered gigs into month groups, preserving order within and across
// months. `today` defaults to the real current date; tests pass a fixed one.
export function groupGigsByMonth(gigs: GigSummary[], today: Date = new Date()): GigMonthGroup[] {
  const currentKey = monthKey(today)
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const nextKey = monthKey(nextMonthDate)
  const nextMonthExpandedByDefault = today.getDate() > 15

  const groups = new Map<string, GigMonthGroup>()
  for (const gig of gigs) {
    const key = monthKey(gig.date)
    let group = groups.get(key)
    if (!group) {
      const defaultExpanded =
        key === currentKey || (key === nextKey && nextMonthExpandedByDefault)
      group = {
        key,
        label: gig.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        gigs: [],
        defaultExpanded,
      }
      groups.set(key, group)
    }
    group.gigs.push(gig)
  }
  return Array.from(groups.values())
}

export async function getGigForPerformance(id: string): Promise<GigPerformanceData | null> {
  return prisma.gig.findUnique({
    where: { id },
    select: {
      id: true,
      date: true,
      venue: { select: { name: true } },
      setlist: {
        select: {
          items: {
            where: { isActive: true },
            select: {
              id: true,
              order: true,
              section: true,
              setNumber: true,
              song: {
                select: { title: true, key: true, lyrics: true, chartFileUrl: true, chartFileType: true },
              },
            },
            orderBy: [{ setNumber: 'asc' }, { order: 'asc' }],
          },
        },
      },
    },
  }).then((row) => {
    if (!row) return null
    const items = row.setlist.items.map((i) => ({
      ...i,
      song: { ...i.song, lyrics: sanitizeLyricsHtml(i.song.lyrics) },
    }))
    const soundcheck = items.filter((i) => i.section === 'SOUNDCHECK')
    const main = items.filter((i) => i.section === 'MAIN')
    const encore = items.filter((i) => i.section === 'ENCORE')
    return { id: row.id, date: row.date, venue: row.venue, items: [...soundcheck, ...main, ...encore] }
  })
}

export async function getGig(id: string): Promise<GigWithDetails | null> {
  const row: any = await prisma.gig.findUnique({
    where: { id },
    include: {
      venue: true,
      setlist: {
          include: {
            items: {
              where: { isActive: true },
              include: { song: { select: { title: true, key: true, singer: true } } },
              orderBy: [{ setNumber: 'asc' }, { order: 'asc' }],
            },
          },
        },
      expenses: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
      musicians: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: { musician: true },
      },
    },
  })
  if (!row) return null
  return {
    ...row,
    amountContracted: toStr(row.amountContracted),
    amountPaid: toStr(row.amountPaid),
    tips: toStr(row.tips),
    otherRevenue: toStr(row.otherRevenue),
    expenses: row.expenses.map((e: any) => ({ ...e, amount: toStr(e.amount)! })),
    musicians: row.musicians.map((m: any) => ({ ...m, amountPaid: toStr(m.amountPaid) })),
  }
}
