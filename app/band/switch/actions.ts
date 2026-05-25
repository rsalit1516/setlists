'use server'

import prisma from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function switchBand(bandId: string): Promise<void> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return

  const membership = await prisma.bandMember.findUnique({
    where: { userId_bandId: { userId, bandId } },
  })
  if (!membership) return

  await prisma.user.update({
    where: { id: userId },
    data: { activeBandId: bandId },
  })

  revalidatePath('/', 'layout')
}
