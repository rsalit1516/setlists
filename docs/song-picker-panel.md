# Song Picker Side Panel

## Story

As a band member editing a setlist on a tablet or desktop, I want to see the full song library alongside the setlist so I can browse, filter by status, and add songs without hunting through a small dropdown at the bottom of each section.

**Acceptance criteria:**
- On tablet (≥768px) and desktop, show a song library panel to the right of the setlist.
- Panel is hidden on mobile; the existing per-section dropdown remains for small screens.
- Filter songs by status: All / Ready / In Progress / Wish.
- A "Add to:" selector in the panel header controls which section (Soundcheck / Set N / Encore) songs are added to.
- Each song row has a `+` button that adds the song to the selected section.
- Songs already in the setlist (in any section) are hidden from the panel.
- Panel is not shown in Revision Mode.
- Panel is sticky — stays visible as the user scrolls through long setlists.

## Tasks

| # | Task | File(s) |
|---|------|---------|
| 1 | Create `SongPickerPanel` Client Component with status filter, section selector, and per-song add buttons | `components/setlists/song-picker-panel.tsx` |
| 2 | Write unit tests (8 cases: filter logic, existingIds exclusion, empty state, addItem call) | `components/setlists/song-picker-panel.test.tsx` |
| 3 | Change setlist page to responsive two-column flex layout; render `SongPickerPanel` in sticky sidebar on md+ | `app/setlists/[id]/page.tsx` |
| 4 | Hide per-section `AddSongForm` dropdown on md+ screens (`md:hidden`) | `components/setlists/setlist-section.tsx` |
| 5 | Add fallback `DATABASE_URL` in test setup so Prisma doesn't throw at import time in unit tests | `vitest.setup.ts` |

## Design decisions

- **Section selector in panel header** (not per-song buttons) — cleaner UX; user sets the target once and fires multiple adds.
- **Global `existingIds`** across all sections — panel never offers songs already in the setlist anywhere.
- **`useTransition`** disables all `+` buttons while an add is pending — prevents double-adds.
- **Sticky sidebar** (`sticky top-6 self-start`) with internal scroll (`overflow-y-auto`, `max-h-[calc(100vh-5rem)]`) keeps the panel usable on long setlists.
