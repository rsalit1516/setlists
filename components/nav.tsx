'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/setlists', label: 'Setlists' },
  { href: '/songs', label: 'Songs' },
  { href: '/venues', label: 'Venues' },
  { href: '/gigs', label: 'Gigs' },
]

export function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Setlists
        </Link>

        {/* Desktop nav */}
        <nav className="hidden gap-6 md:flex" aria-label="Main">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm transition-colors ${
                pathname.startsWith(href)
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t bg-background px-4 py-2 md:hidden" aria-label="Mobile">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`block py-3 text-sm ${
                pathname.startsWith(href)
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
