'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { Session } from 'next-auth'
import { handleSignOut } from '@/app/auth/signout/actions'
import { switchBand } from '@/app/band/switch/actions'

const links = [
  { href: '/setlists', label: 'Setlists' },
  { href: '/songs', label: 'Songs' },
  { href: '/venues', label: 'Venues' },
  { href: '/gigs', label: 'Gigs' },
]

type BandOption = { id: string; name: string }

type NavProps = {
  session: Session | null
  activeBand: BandOption | null
  bands: BandOption[]
}

export function Nav({ session, activeBand, bands }: NavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const user = session?.user

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Setlists
          </Link>
          {activeBand && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              · {activeBand.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
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

          {/* User menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium hover:bg-muted/80"
                aria-label="User menu"
              >
                {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md border bg-background shadow-md">
                  <div className="border-b px-3 py-2">
                    <p className="text-sm font-medium">{user.name ?? user.email}</p>
                    {user.name && (
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    )}
                  </div>

                  {/* Band switcher */}
                  {bands.length > 1 && (
                    <div className="border-b py-1">
                      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Switch Band
                      </p>
                      {bands.map((band) => (
                        <button
                          key={band.id}
                          type="button"
                          onClick={async () => {
                            await switchBand(band.id)
                            setUserMenuOpen(false)
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 ${
                            band.id === activeBand?.id ? 'font-medium text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {band.id === activeBand?.id && (
                            <span className="text-xs">✓</span>
                          )}
                          <span>{band.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="py-1">
                    <form action={handleSignOut}>
                      <button
                        type="submit"
                        className="flex w-full items-center px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t bg-background px-4 py-2 md:hidden" aria-label="Mobile">
          {activeBand && (
            <p className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {activeBand.name}
            </p>
          )}
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
          {user && (
            <div className="border-t pt-2">
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="block w-full py-2 text-left text-sm text-muted-foreground"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </nav>
      )}
    </header>
  )
}
