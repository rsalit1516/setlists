import prisma from '@/lib/db'

export type OwnedEntity =
  | 'gig'
  | 'setlist'
  | 'venue'
  | 'musician'
  | 'bandSong'
  | 'expense'
  | 'gigMusician'
  | 'setlistItem'

export class NotFoundError extends Error {
  constructor(entity: OwnedEntity) {
    super(`${entity} not found`)
    this.name = 'NotFoundError'
  }
}

// Server actions receive ids from the browser, so every one that touches an existing row has to prove
// the row belongs to the caller's band first. Child rows (expenses, gig musicians, setlist items) have
// no bandId of their own and inherit it through their parent. Soft-deleted rows still count as owned.
function countOwned(entity: OwnedEntity, bandId: string, ids: string[]): Promise<number> {
  const id = { in: ids }
  switch (entity) {
    case 'gig':
      return prisma.gig.count({ where: { id, bandId } })
    case 'setlist':
      return prisma.setlist.count({ where: { id, bandId } })
    case 'venue':
      return prisma.venue.count({ where: { id, bandId } })
    case 'musician':
      return prisma.musician.count({ where: { id, bandId } })
    case 'bandSong':
      return prisma.bandSong.count({ where: { id, bandId } })
    case 'expense':
      return prisma.expense.count({ where: { id, gig: { bandId } } })
    case 'gigMusician':
      return prisma.gigMusician.count({ where: { id, gig: { bandId } } })
    case 'setlistItem':
      return prisma.setlistItem.count({ where: { id, setlist: { bandId } } })
  }
}

export async function areOwned(entity: OwnedEntity, bandId: string, ids: string[]): Promise<boolean> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return true
  return (await countOwned(entity, bandId, unique)) === unique.length
}

export function isOwned(entity: OwnedEntity, bandId: string, id: string): Promise<boolean> {
  return areOwned(entity, bandId, [id])
}

export async function assertOwned(entity: OwnedEntity, bandId: string, ...ids: string[]): Promise<void> {
  if (!(await areOwned(entity, bandId, ids))) throw new NotFoundError(entity)
}
