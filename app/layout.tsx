export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Nav } from '@/components/nav'
import { auth } from '@/auth'
import prisma from '@/lib/db'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Setlists',
  description: 'Band setlist manager',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  let activeBand: { id: string; name: string } | null = null
  let bands: { id: string; name: string }[] = []

  if (session?.user?.id) {
    const memberships = await prisma.bandMember.findMany({
      where: { userId: session.user.id },
      include: { band: { select: { id: true, name: true } } },
      orderBy: { band: { name: 'asc' } },
    })
    bands = memberships.map((m) => m.band)
    activeBand = bands.find((b) => b.id === session.user.activeBandId) ?? bands[0] ?? null
  }

  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Nav session={session} activeBand={activeBand} bands={bands} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
