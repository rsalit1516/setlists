import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export async function requireBandId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.activeBandId) {
    redirect('/auth/signin')
  }
  return session.user.activeBandId
}

export async function getActiveBandId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.activeBandId ?? null
}
