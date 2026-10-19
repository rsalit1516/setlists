# Tenant-isolation tests

`lib/tenant-isolation.integration.test.ts` checks that one band can never read or change another band's
data. Unlike the mocked unit tests (which only prove a query *contains* `bandId`), it runs the real
services and server actions against a real Postgres with two bands in it.

It covers:

- every band-scoped read (gigs, venues, musicians, setlists, finance, the gig-based stats), including
  lookups by id for a row that belongs to the other band
- the ownership helpers in `lib/ownership.ts`
- mutations given the other band's ids: they must throw `NotFoundError` or return "not found", and the
  other band's rows must be unchanged afterwards
- rows we create are stamped with our band

## Running it

The test is skipped unless `TENANT_TEST_DATABASE_URL` is set. It **refuses any host except
`localhost` / `127.0.0.1`** because it inserts and deletes rows (everything it creates has an `iso-` id
prefix and is removed afterwards). Never point it at Supabase.

```bash
docker run -d --name setlists-isotest -e POSTGRES_PASSWORD=pw -p 55433:5432 postgres:16
export TENANT_TEST_DATABASE_URL=postgresql://postgres:pw@localhost:55433/postgres
DIRECT_URL=$TENANT_TEST_DATABASE_URL npx prisma migrate deploy
npx vitest run lib/tenant-isolation.integration.test.ts
docker rm -f setlists-isotest
```

On PowerShell, set the variables with `$env:TENANT_TEST_DATABASE_URL = '...'` and `$env:DIRECT_URL = '...'`.

CI runs the same thing in the `isolation` job of `.github/workflows/ci.yml`, against a Postgres service
container.

## When to extend it

Add a case whenever a new band-owned table, service or action lands (for example `BandSong` in #133):
seed a row for each band in the test, then assert the reads exclude the other band's row and the
mutations reject its id.

## Dev seed

`prisma/seed.ts` creates two bands so isolation problems are visible on the dev site: "The Ruminators"
(the band the migration creates) and "The Test Pilots", each with its own venue, musician, setlists and
gigs. The Test Pilots also have a past unpaid gig with an expense, so the Stats and Finance pages differ
between the bands. It also creates three fake users with memberships (an admin per band, plus one user
who belongs to both) for when sign-in arrives in #140.
