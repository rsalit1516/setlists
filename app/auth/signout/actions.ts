'use server'

import { signOut } from '@/auth'

export async function handleSignOut(): Promise<void> {
  await signOut({ redirectTo: '/auth/signin' })
}
