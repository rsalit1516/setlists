'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type NavLink = { href: string; label: string }
type NavGroup = { label: string; children: NavLink[] }
type NavEntry = NavLink | NavGroup

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry
}

function isActive(pathname: string, href: string): boolean {
  return pathname.startsWith(href)
}

function isGroupActive(pathname: string, group: NavGroup): boolean {
  return group.children.some((child) => isActive(pathname, child.href))
}

function navLinkClassName(active: boolean, inactiveClassName: string): string {
  return active ? 'font-bold text-accent-1-foreground' : inactiveClassName
}

const navItems: NavEntry[] = [
  { href: '/gigs', label: 'Gigs' },
  { href: '/songs', label: 'Songs' },
  { href: '/finance', label: 'Finance' },
  { href: '/stats', label: 'Stats' },
  {
    label: 'Directory',
    children: [
      { href: '/venues', label: 'Venues' },
      { href: '/musicians', label: 'Musicians' },
    ],
  },
]

export function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-xl font-bold tracking-tight">
          Setlists
        </Link>

        {/* Desktop nav */}
        <nav className="hidden flex-wrap items-center gap-5 md:flex" aria-label="Main">
          {navItems.map((item) =>
            isGroup(item) ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger
                  className={`flex items-center gap-1 text-[13px] font-medium transition-colors outline-none ${navLinkClassName(
                    isGroupActive(pathname, item),
                    'text-muted-foreground hover:text-foreground'
                  )}`}
                >
                  {item.label} <span className="text-[10px]">▾</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {item.children.map((child) => (
                    <DropdownMenuItem key={child.href} render={<Link href={child.href} />}>
                      {child.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[13px] font-medium transition-colors ${navLinkClassName(
                  isActive(pathname, item.href),
                  'text-muted-foreground hover:text-foreground'
                )}`}
              >
                {item.label}
              </Link>
            )
          )}
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
          {navItems.map((item) =>
            isGroup(item) ? (
              <div key={item.label} className="py-1">
                <div className="pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {item.label}
                </div>
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => setOpen(false)}
                    className={`block py-3 pl-3 text-sm ${navLinkClassName(
                      isActive(pathname, child.href),
                      'text-muted-foreground'
                    )}`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block py-3 text-sm ${navLinkClassName(
                  isActive(pathname, item.href),
                  'text-muted-foreground'
                )}`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
      )}
    </header>
  )
}
