# Multi-band support — schema and impact design

Status: **draft for discussion** (2026-10-19). Nothing here is implemented.

## Goals

- Several bands share one deployment; a band's gigs, setlists, venues, roster and finances are invisible to other bands.
- Songs can be shared across bands (title, artist, genres, default key/BPM/length, lyrics, charts), with per-band overrides that never alter the generic version.
- Per-band, per-song data (status, singer, keyboard) is already band-specific by nature.
- Invite-only first; the model must not need rework for self-serve signup later.
- Sequencing goal: **the tenant schema and query scoping ship before, and independently of, the auth provider choice.**

## Proposed schema

### New models

| Model | Purpose |
|---|---|
| `Band` | The tenant. `id`, `name`, timestamps. |
| `User` | A login identity (email, name). Exact shape depends on the auth provider (see Auth). |
| `BandMember` | `userId`, `bandId`, `role`. `@@unique([userId, bandId])`. Roles: `ADMIN` (sees finances, manages members), `MEMBER`, `VIEWER`. |
| `BandSong` | Join between `Band` and `Song`: that band's view of a song (see below). |

### Changed models

| Model | Change |
|---|---|
| `Venue`, `Setlist`, `Gig`, `Musician` | Add required `bandId`. `Musician.name` is currently globally `@unique`; becomes `@@unique([bandId, name])`. |
| `Musician` | Add optional `userId` so a roster entry can be linked to a login. A user in two bands has two `Musician` rows. |
| `SetlistItem` | `songId` is replaced by `bandSongId` pointing to `BandSong`, so a setlist can only reference songs in its own band's catalog. |
| `Song` | Becomes the **generic** record. Keeps title, artist, genres, default key / bpm / durationSeconds, lyrics, lyricsUrl/chartsUrl, chart file fields, lyrics-import fields. Loses `status`, `singer`, `keyboardRequired` (move to `BandSong`). |
| `Genre` | Stays global. Genres classify the shared catalog. |
| `Expense`, `GigMusician` | Unchanged. They inherit the tenant through `Gig`. |

### Key types

New tables (`Band`, `User`, `BandMember`, and everything added later) use UUIDv7 primary keys (`@db.Uuid`); `bandId` columns on existing tables are `uuid` too. Existing tables keep text `cuid` ids until #152 converts them. Consequence: a new table that references an existing one (e.g. `BandSong.songId` → `Song.id`) uses a text column until that conversion lands, then is altered with the rest.

### `BandSong`

```
model BandSong {
  id               String     @id @default(cuid())
  bandId           String
  songId           String
  // band-owned fields (no generic equivalent)
  status           SongStatus @default(WISH)
  singer           String?
  keyboardRequired Boolean    @default(false)
  isActive         Boolean    @default(true)
  // nullable overrides; null = inherit from Song
  keyOverride      String?
  bpmOverride      Int?
  durationOverride Int?
  lyricsOverride   String?
  chartFileOverrideUrl/Type/Name  String?
  lyricsBasedOn    DateTime?   // Song.updatedAt (lyrics) when the override was forked

  @@unique([bandId, songId])
}
```

Resolution lives in one function (e.g. `resolveSong(bandSong, song)` in `lib/services/songs.ts`): `bandSong.keyOverride ?? song.key`, and so on. No screen reimplements it.

"Generic lyrics changed since you forked" is derived by comparing `lyricsBasedOn` with the generic lyrics' last-modified time. This needs a dedicated `Song.lyricsUpdatedAt`, because `updatedAt` also moves on unrelated edits.

### Keeping the UI churn small

`lib/types.ts` keeps its `Song` type, but it now means the **resolved view**, with `id` equal to the `BandSong` id. Routes such as `/songs/[id]` keep working with new ids, and components that render a song need little or no change. Only the service layer and the song create/edit/import actions change shape.

## Migration (expand, backfill, contract)

All of this is plain SQL inside Prisma migrations, since production has real data.

1. **Expand.** Create `Band`, `User`, `BandMember`, `BandSong`. Add nullable `bandId` to `Venue`, `Setlist`, `Gig`, `Musician`. Add nullable `SetlistItem.bandSongId`.
2. **Backfill.** Insert the one existing band. Set `bandId` on every row. Create one `BandSong` per `Song`, copying `status`, `singer`, `keyboardRequired`, `isActive`. Set `SetlistItem.bandSongId` through `songId`.
3. **Tighten.** Make `bandId` and `bandSongId` `NOT NULL`. Swap the `Musician.name` unique index. Add indexes on `bandId` (+ `date` for `Gig`).
4. **Contract (separate, later release).** Drop `SetlistItem.songId` and `Song.status/singer/keyboardRequired`. Keeping the old columns for one release gives an easy rollback.

`prisma/seed.ts` must create the dev band, `BandSong` rows and memberships in the same PR. The dev site is reset from the seed, so this is also the migration dry run.

## Code impact

Roughly 75 Prisma call sites across 15 non-test files:

| Area | Sites | Work |
|---|---|---|
| `app/gigs/actions.ts` | 24 | Every mutation takes ids from FormData, so each needs an ownership check |
| `app/setlists/actions.ts` | 13 | Same, plus `bandSongId` for items |
| `app/songs/actions.ts` | 7 | Rework: create-or-attach to catalog, edit generic vs edit override |
| `app/venues`, `genres`, `musicians` actions | 9 | Scope by band (genres unscoped) |
| `lib/services/*.ts` | ~28 | Take `bandId`; songs/setlists/gigs/stats/finance/lyrics-import are the heavy ones |
| Tests | 11 service test files + `musicians/actions.test.ts` | Assertions updated; new tenant-isolation tests |

### Scoping pattern (recommended)

1. A single server helper `getBandContext()` returns `{ userId, bandId, role }`. Initially it returns the single seeded band, so behaviour is unchanged. Auth later replaces its body with session lookup.
2. Services take `bandId` as an **explicit first parameter** (`getGigs(bandId)`), which is easy to test and review. The alternative of implicit scoping through a Prisma client extension is hidden magic and hard to audit; it could be added later as a second line of defence.
3. **Mutations are the real risk.** Today `update({ where: { id } })` trusts an id from the browser. In a multi-tenant app that is a cross-tenant write bug. About 29 `findUnique`/`update`/`delete` sites must become `updateMany({ where: { id, bandId } })` or an ownership check that throws. A shared `assertOwned` helper keeps this uniform.
4. Finance, the per-musician payments, and `Gig` money fields are gated on `role === 'ADMIN'` at the service boundary, not just hidden in the UI.
5. Later hardening: Postgres RLS keyed on a per-request setting, as a backstop. Not required for the first release, and it conflicts with the pooled-connection setup unless done carefully, so it is its own story.

## Auth (decoupled from the schema)

The existing `feature/authentication` branch should **not** be merged:

- It is based on an older schema (missing about 20 fields added since) and also commits `supabase/.temp/*` and a 543-line `remote_schema.sql`.
- It puts `bandId` directly on `Song`, which contradicts the shared catalog.
- It puts `userId` on `GigMusician`; the link belongs on `Musician`.
- It is hard-wired to Entra with the `consumers` tenant and database sessions.

Worth salvaging: the `Band` / `BandMember` / `MemberRole` shape, the `requireBandId` helper idea, and `activeBandId` on the session.

Provider choice (Supabase Auth vs Auth.js with email magic link / Google / passkeys, vs Entra External ID) is its own decision. Because `getBandContext()` is the only seam, it can be made after the tenant work lands.

## Proposed stories

1. **Tenant foundation.** `Band`, `BandMember`, `bandId` on Venue/Setlist/Gig/Musician, backfill, `getBandContext()` stub, services and actions scoped, ownership checks, tenant-isolation tests, seed update.
2. **Song catalog split.** `BandSong` + resolver, `SetlistItem.bandSongId`, song create-or-attach flow, stats/finance/lyrics-import updated, contract migration.
3. **Per-band overrides UI.** Edit key/BPM/length per band, lyrics fork with "reset to generic" and "generic changed" notice.
4. **Auth and sessions.** Provider decision (ADR), invite flow, band switcher, long-lived device sessions.
5. **Roles.** Finance gating, member management.
6. **PWA / offline.**

Stories 1 and 2 could be one release or two. Splitting is safer, since 1 changes the tenant boundary and 2 changes the song model, and each is a risky migration on its own.

## Open questions

- **Who may edit the generic song?** Options: any ADMIN of a band that has it, only the creator, or "suggest a fix". For the invite-only phase, "creator band's ADMINs" is enough.
- **Private songs.** Original material one band does not want in a global catalog. Likely `Song.ownerBandId` + `isPrivate`. Needed before self-serve.
- **Lyrics and copyright.** Sharing imported lyrics between unrelated paying customers is a different risk than one band's own use. Worth a decision before any commercial offering.
- **Lyrics override model.** Full text fork (simple, proposed) vs annotations layer (handles upstream fixes better, harder).
- **Duplicates in the catalog.** Attach-vs-create needs a title/artist search with a "did you mean" step.
- **Genres.** Global for now; per-band genres may be wanted later.
