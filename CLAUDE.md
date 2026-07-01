# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# Setlists App — Project Conventions

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm run lint         # ESLint
npm test             # run all tests (vitest)
npx vitest run lib/services/songs.test.ts   # run a single test file
npx prisma migrate dev    # apply schema changes
npx prisma generate       # regenerate Prisma client after schema changes
```

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.4 — App Router |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| CSS | Tailwind CSS v4 |
| Component library | shadcn/ui (Base UI primitives — `@base-ui/react`) |
| Testing | Vitest + React Testing Library |

## Architecture Overview

The app manages band setlists, songs, venues, and gigs. The core data model:
- **Song** — catalog of all songs (status: READY / IN_PROGRESS / WISH)
- **Setlist** → **SetlistItem** → **Song** — ordered list of songs with sections (SOUNDCHECK / MAIN / ENCORE) and set numbers
- **Gig** — a dated performance at a **Venue**, linked 1:1 to a **Setlist**, with expenses and musicians

Data flows: `lib/services/*.ts` (Prisma queries) → async Server Components → `components/**` (UI) → `app/**/actions.ts` (mutations).

All shared TypeScript types live in **`lib/types.ts`** — import from there, not from `@prisma/client` (see Prisma enum note below).

## File & Folder Structure

```
app/
  layout.tsx           # root layout — Server Component
  page.tsx             # home page
  songs/
    page.tsx           # list / index — Server Component
    [id]/page.tsx      # detail — Server Component
    actions.ts         # "use server" mutations for this route
  setlists/
  venues/
  gigs/
components/            # shared UI components, organized by domain
  ui/                  # shadcn/ui components — do not edit directly
  setlists/            # setlist-specific components
  songs/
  gigs/
  venues/
lib/
  db.ts                # Prisma singleton
  types.ts             # all shared TypeScript types
  utils.ts             # shadcn cn() helper
  services/            # pure query functions (server-only, no "use server")
prisma/
  schema.prisma
```

## Responsive Design

This app must work on **desktop, tablet, and phone**. Always design mobile-first:

- Default styles target mobile (small screens).
- Use Tailwind responsive prefixes to scale up: `sm:`, `md:`, `lg:`.
- Touch targets must be at least 44×44px.
- Test layouts at 375px (phone), 768px (tablet), and 1280px (desktop).

## Server vs Client Components

- **Default to Server Components.** Pages, layouts, and pure-display components stay server-side.
- Add `'use client'` only when the component needs: state (`useState`), event handlers (`onClick`), browser APIs, or third-party client-only libs.
- Keep `'use client'` boundaries as **leaf nodes** — don't mark large parent trees as client when only a small child needs it.
- `lib/services/` files are server-only — query Prisma directly; do **not** add `'use server'` to them.

## Data Fetching

- Fetch data in **async Server Components** by calling service functions directly (no API layer needed).
- In dynamic routes, both `params` and `searchParams` are **Promises** — always `await` them:
  ```ts
  export default async function Page({
    params,
    searchParams,
  }: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ revision?: string }>
  }) {
    const { id } = await params
    const { revision } = await searchParams
  ```
- Use `<Suspense>` with a skeleton fallback around slow data; add a `loading.tsx` in the route folder for full-page loading states.
- For parallel independent queries, initiate them without `await`, then `Promise.all`:
  ```ts
  const [songs, venues] = await Promise.all([getSongs(), getVenues()])
  ```

## Mutations (Server Functions / Server Actions)

- Put mutations in `actions.ts` files co-located with their route: `app/songs/actions.ts`.
- Mark each function individually with `'use server'` **or** put `'use server'` at the top of the file.
- After mutating, call `revalidatePath('/songs')` (or the relevant path) so the page re-renders fresh data.
- For redirect-after-create flows, call `revalidatePath` then `redirect` — **nothing runs after `redirect`**.
- Use `useActionState` in Client Components to show pending/error states.

## shadcn/ui

- Install components with `npx shadcn@latest add <component>` — they land in `components/ui/`.
- Import from `@/components/ui/<component>`.
- Do not edit generated shadcn files directly unless customizing for this app specifically.
- Compose shadcn primitives with Tailwind classes.

## Testing

- **Framework**: Vitest + `@testing-library/react` + `@testing-library/user-event`.
- **Location**: co-locate test files alongside the code they test — `songs.test.ts` next to `songs.ts`.
- **What to test**: service functions (unit), Server Actions (unit with mocked Prisma), and key interactive Client Components.
- **What not to test**: plain layout/display Server Components that are just data → JSX — they have no logic to test.
- Mock the Prisma singleton with `vi.mock('@/lib/db', () => ({ default: { song: { findMany: vi.fn(), ... } } }))`.
- Run tests with `npm test`; run a single file with `npx vitest run <path>`.

## Database / Prisma

- Schema lives in `prisma/schema.prisma`. Always run `npx prisma migrate dev` after schema changes.
- The Prisma client is a singleton in `lib/db.ts` — import `db` from there, never create a new `PrismaClient` elsewhere.
- Generate types after schema changes: `npx prisma generate`.
- **Prisma enum imports don't resolve via `@prisma/client`** due to a TypeScript path resolution quirk with this adapter setup. Define enum types locally as string unions (e.g. `type SongStatus = 'READY' | 'IN_PROGRESS' | 'WISH'`) and cast FormData values to them. They match at runtime. All such types are already defined in `lib/types.ts`.
- **`Decimal` fields** (`amountContracted`, `amountPaid`, `amount`, `share`) are not JSON-serializable. Service functions convert them to `string | null` via a `toStr()` helper before returning. The corresponding types in `lib/types.ts` use `string | null`.

## Environment Variables

- Server-side secrets go in `.env` (never commit this file).
- Client-accessible vars must be prefixed `NEXT_PUBLIC_`.
- `DATABASE_URL` and `DIRECT_URL` are the required variables for local dev.
- `DATABASE_URL` is Supabase's **transaction-mode pooler** (port 6543, `pgbouncer=true`) — used by the running app (`lib/db.ts`).
- `DIRECT_URL` is Supabase's **session-mode pooler** (port 5432, no `pgbouncer` flag) — used only by the Prisma CLI via `prisma.config.ts`. Transaction-mode pooling doesn't support the advisory locks `prisma migrate`/`db push` need, so CLI commands hang indefinitely (no error, just stalls after "Datasource ... loaded") if pointed at `DATABASE_URL`. If that happens, confirm `prisma.config.ts`'s `datasource.url` reads `DIRECT_URL`, not `DATABASE_URL`.

## Code Style

- No comments unless the **why** is non-obvious.
- No `any` — use proper types or `unknown`.
- Prefer named exports over default exports for components (shadcn components are the exception).
- Sort Tailwind classes with Prettier's tailwind plugin (if added).
- **No inline `style` props.** Use Tailwind classes for all styling. When Tailwind can't express a value (e.g. print-specific `pt` units, `@page` rules), add a named class to `app/globals.css` instead.
