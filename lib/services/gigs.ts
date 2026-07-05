import prisma from '@/lib/db'
import type { GigSummary, GigWithDetails } from '@/lib/types'

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
  }))
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
    expenses: row.expenses.map((e: any) => ({ ...e, amount: toStr(e.amount)! })),
    musicians: row.musicians.map((m: any) => ({ ...m, share: toStr(m.share) })),
  }
}
