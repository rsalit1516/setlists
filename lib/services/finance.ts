import prisma from '@/lib/db'
import type { FinanceGigRow, FinanceReport, FinanceYearSummary } from '@/lib/types'
import { calculateGigNet, calculateTotalExpenses } from './gigs'

// Decimal fields come back from Prisma as Decimal | null — typed `unknown` here
// (rather than importing Prisma's Decimal type) to match the toStr() helper below.
type GigFinanceRow = {
  id: string
  date: Date
  amountContracted: unknown
  amountPaid: unknown
  tips: unknown
  otherRevenue: unknown
  venue: { name: string }
  expenses: { amount: unknown }[]
  musicians: { amountPaid: unknown }[]
}

function toStr(d: unknown): string | null {
  if (d === null || d === undefined) return null
  return String(d)
}

export function calculateMusicianPayouts(musicians: { amountPaid: string | null }[]): number {
  return musicians.reduce((sum, m) => sum + (m.amountPaid ? parseFloat(m.amountPaid) : 0), 0)
}

function emptyYearSummary(year: number): FinanceYearSummary {
  return {
    year,
    gigCount: 0,
    totalContracted: 0,
    totalPaidByVenue: 0,
    totalTips: 0,
    totalOtherRevenue: 0,
    totalExpenses: 0,
    totalMusicianPayouts: 0,
    net: 0,
  }
}

function addGigToSummary(summary: FinanceYearSummary, row: FinanceGigRow): FinanceYearSummary {
  return {
    ...summary,
    gigCount: summary.gigCount + 1,
    totalContracted: summary.totalContracted + (row.amountContracted ? parseFloat(row.amountContracted) : 0),
    totalPaidByVenue: summary.totalPaidByVenue + (row.amountPaid ? parseFloat(row.amountPaid) : 0),
    totalTips: summary.totalTips + (row.tips ? parseFloat(row.tips) : 0),
    totalOtherRevenue: summary.totalOtherRevenue + (row.otherRevenue ? parseFloat(row.otherRevenue) : 0),
    totalExpenses: summary.totalExpenses + row.totalExpenses,
    totalMusicianPayouts: summary.totalMusicianPayouts + row.totalMusicianPayouts,
    net: summary.net + row.net,
  }
}

// `now` is injectable so tests don't depend on the real clock; callers omit it.
export async function getFinanceReport(now: Date = new Date()): Promise<FinanceReport> {
  const currentYear = now.getFullYear()

  const rows: GigFinanceRow[] = await prisma.gig.findMany({
    where: { isActive: true },
    orderBy: { date: 'desc' },
    include: {
      venue: { select: { name: true } },
      expenses: { where: { isActive: true }, select: { amount: true } },
      musicians: { where: { isActive: true }, select: { amountPaid: true } },
    },
  })

  const gigRows: FinanceGigRow[] = rows.map((r) => {
    const revenue = {
      amountPaid: toStr(r.amountPaid),
      tips: toStr(r.tips),
      otherRevenue: toStr(r.otherRevenue),
    }
    const expenses = r.expenses.map((e) => ({ amount: toStr(e.amount)! }))
    const musicians = r.musicians.map((m) => ({ amountPaid: toStr(m.amountPaid) }))
    const totalExpenses = calculateTotalExpenses(expenses)
    return {
      id: r.id,
      date: r.date,
      venueName: r.venue.name,
      amountContracted: toStr(r.amountContracted),
      amountPaid: revenue.amountPaid,
      tips: revenue.tips,
      otherRevenue: revenue.otherRevenue,
      totalExpenses,
      totalMusicianPayouts: calculateMusicianPayouts(musicians),
      net: calculateGigNet(revenue, totalExpenses),
    }
  })

  const currentYearGigs = gigRows.filter((g) => new Date(g.date).getFullYear() === currentYear)

  const pastYearsByYear = new Map<number, FinanceYearSummary>()
  for (const row of gigRows) {
    const year = new Date(row.date).getFullYear()
    if (year === currentYear) continue
    pastYearsByYear.set(year, addGigToSummary(pastYearsByYear.get(year) ?? emptyYearSummary(year), row))
  }
  const pastYears = Array.from(pastYearsByYear.values()).sort((a, b) => b.year - a.year)

  const currentYearTotals = currentYearGigs.reduce(
    (summary, row) => addGigToSummary(summary, row),
    emptyYearSummary(currentYear)
  )

  return { currentYear, currentYearGigs, currentYearTotals, pastYears }
}
