import prisma from '@/lib/db'
import type { GigSummary, GigWithDetails, GigPerformanceData } from '@/lib/types'
import { sanitizeLyricsHtml } from '@/lib/services/sanitize-lyrics'

function toStr(d: unknown): string | null {
  if (d === null || d === undefined) return null
  return String(d)
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
      musicians: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
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
