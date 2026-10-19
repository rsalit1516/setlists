# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# Setlists App — Project Conventions

## Workflow — Starting a Story

- Every GitHub issue ("story") is implemented in its own git worktree — never commit directly on `main` for issue work. Before writing any code for an issue, create/enter a worktree via the `EnterWorktree` tool (or `git worktree add .claude/worktrees/<slug> -b issue-<n>-<slug>` if working outside this harness).
- Name the worktree/branch after the issue: `issue-<number>-<short-slug>` (e.g. `issue-17-gig-payment-fields`).
- **Branch from `develop`, not `main`.** Update `develop` first (`git fetch origin`) and base the worktree on `origin/develop`. If the harness creates the worktree from `main`, rebase/reset it onto `origin/develop` before writing code.
- Leave the worktree in place until the PR merges. Don't remove a worktree with uncommitted or unmerged work without checking with the user first.

## Workflow — Finishing a Story

- Don't merge directly, even for solo-developer changes. Commit the finished work in its worktree, push the branch, and open a PR with `gh pr create` — leave the merge itself to the user via the GitHub UI.
- This applies even when the change looks trivial. The PR is the review checkpoint: it's where the user reads the diff, can request a second AI review, and keeps a handle on a codebase they didn't type line-by-line.
- Write the PR body to reference the issue it closes (e.g. `Closes #40`) and summarize what changed and how it was verified (tests run, lint/typecheck status).

## Workflow — Staged Releases (develop → main)

Changes ship in two stages. Full detail (environments, approval, DB reset) is in `docs/environments.md`.

1. **Story PR → `develop`.** Open with `gh pr create --base develop`. **Never target `main` with story work.** CI must pass. The user merges it; the dev site then auto-deploys and migrates the seeded dev database.
2. **Test on the dev site.** The user verifies the change against the dev site (fake seed data). If the change needs new seed data, update `prisma/seed.ts` in the same PR.
3. **Release PR `develop` → `main`.** Only once the user says the change is tested. Open with `gh pr create --base main --head develop`. List the included story PRs/issues in the body. After merging, the production deploy waits for the user's approval in GitHub Actions.

- Don't open the release PR on your own initiative; wait for the user to ask or confirm testing is done.
- Hotfixes are the only exception to branching from `develop`: confirm with the user first.
- Keep `develop` from drifting behind `main`: after a release or any direct `main` change, `main` must be merged back into `develop`.

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
- **Mandatory coverage**: every new or changed function in `lib/services/*.ts` or `actions.ts` ships with corresponding test coverage in the same change (new tests for new logic, updated assertions for changed logic). Don't leave this for a follow-up — if a schema or behavior change touches a file with an existing `*.test.ts`, that test file is part of the change.
- Mock the Prisma singleton with `vi.mock('@/lib/db', () => ({ default: { song: { findMany: vi.fn(), ... } } }))`.
- Run tests with `npm test`; run a single file with `npx vitest run <path>`.

## Database / Prisma

- Schema lives in `prisma/schema.prisma`. Always run `npx prisma migrate dev` after schema changes.
- The Prisma client is a singleton in `lib/db.ts` — import `db` from there, never create a new `PrismaClient` elsewhere.
- Generate types after schema changes: `npx prisma generate`.
- **Primary keys: UUIDv7 for every new table.** Use `id String @id @default(uuid(7)) @db.Uuid`, and `@db.Uuid` on every foreign-key column that references a UUID table (Postgres can't join a `uuid` column to a `text` one). Prisma generates v7 client-side, so no Postgres extension is needed. Migration SQL that inserts fixed rows uses UUID literals. Pre-existing tables (Song, Genre, Venue, Musician, Setlist, SetlistItem, Gig, Expense, GigMusician) still use `cuid()` text ids until #152 converts them; a new column that points at one of them stays `String` (text). Don't add new `cuid()` keys.
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
