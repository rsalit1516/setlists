@AGENTS.md

# Setlists App — Project Conventions

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

## Responsive Design

This app must work on **desktop, tablet, and phone**. Always design mobile-first:

- Default styles target mobile (small screens).
- Use Tailwind responsive prefixes to scale up: `sm:`, `md:`, `lg:`.
- Touch targets must be at least 44×44px.
- Test layouts at 375px (phone), 768px (tablet), and 1280px (desktop).

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
components/            # shared UI components (root level, managed by shadcn)
  ui/                  # shadcn/ui components — do not edit directly
lib/
  db.ts                # Prisma singleton
  utils.ts             # shadcn cn() helper
  services/            # pure query functions (server-only, no "use server")
prisma/
  schema.prisma
```

## Server vs Client Components

- **Default to Server Components.** Pages, layouts, and pure-display components stay server-side.
- Add `'use client'` only when the component needs: state (`useState`), event handlers (`onClick`), browser APIs, or third-party client-only libs.
- Keep `'use client'` boundaries as **leaf nodes** — don't mark large parent trees as client when only a small child needs it.
- `lib/services/` files are server-only — query Prisma directly; do **not** add `'use server'` to them.

## Data Fetching

- Fetch data in **async Server Components** by calling service functions directly (no API layer needed).
- In dynamic routes, `params` is a **Promise** — always `await` it:
  ```ts
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
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
- Run tests with `npm test`.
- Aim for tests that cover the critical business rules (ordering, status transitions, financial calculations).

## Database / Prisma

- Schema lives in `prisma/schema.prisma`. Always run `npx prisma migrate dev` after schema changes.
- The Prisma client is a singleton in `lib/db.ts` — import `db` from there, never create a new `PrismaClient` elsewhere.
- Generate types after schema changes: `npx prisma generate`.
- **Prisma enum imports don't resolve via `@prisma/client`** due to a TypeScript path resolution quirk with this adapter setup. Define enum types locally as string unions (e.g. `type SongStatus = 'READY' | 'IN_PROGRESS' | 'WISH'`) and cast FormData values to them. They match at runtime.

## Environment Variables

- Server-side secrets go in `.env` (never commit this file).
- Client-accessible vars must be prefixed `NEXT_PUBLIC_`.
- `DATABASE_URL` is the only required variable for local dev.

## Code Style

- No comments unless the **why** is non-obvious.
- No `any` — use proper types or `unknown`.
- Prefer named exports over default exports for components (shadcn components are the exception).
- Sort Tailwind classes with Prettier's tailwind plugin (if added).
- **No inline `style` props.** Use Tailwind classes for all styling. When Tailwind can't express a value (e.g. print-specific `pt` units, `@page` rules), add a named class to `app/globals.css` instead.
