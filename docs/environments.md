# Environments and releasing

| | Dev | Production |
|---|---|---|
| Branch | `develop` | `main` |
| Site | Dev Static Web App (separate Azure resource, Free tier) | `Setlists` static web app |
| Database | Dev Supabase project — disposable, fake seed data | Production Supabase project — real data |
| Deploys | Automatically on push to `develop` | On push to `main`, **after a required reviewer approves** |
| Workflow | `azure-static-web-apps-dev.yml` | `azure-static-web-apps-proud-ocean-04af2510f.yml` |

PRs into `develop` and `main` run `ci.yml` (type-check, lint, tests, build). There are no PR preview
sites: a hybrid Next.js app reads `DATABASE_URL` at request time from the Azure resource's
Environment variables, which staging environments inherit, so a preview of the production app would
read production data.

## Release flow

1. Branch from `develop`, open a PR into `develop`. CI must pass. Merge.
2. The dev site redeploys and migrates the dev database. Try the change there.
3. When it's good, open a PR `develop` → `main`. CI must pass. Merge.
4. The production workflow starts and **waits for approval**. Check the dev site worked, and if the
   change includes a destructive migration, take a manual Supabase backup first. Approve in
   GitHub → Actions → the run → *Review deployments*.
5. Approval runs `prisma migrate deploy` against production, then deploys.

## Resetting the dev database

The dev database can be wiped any time. From a machine with the dev connection strings in `.env`
(**never the production ones** — check `DIRECT_URL` before running):

```bash
ALLOW_SEED=true npx prisma migrate reset
```

This drops everything, reapplies all migrations and runs `prisma/seed.ts` (fake songs, a gig,
musicians). `ALLOW_SEED=true` is required, so the seed refuses to run if you haven't opted in.
To add the seed data to a database without wiping it: `ALLOW_SEED=true npx prisma db seed`.

## One-time setup

### 1. Dev Supabase project
1. supabase.com → New project (Free). Name it e.g. `setlists-dev`.
2. Project → Connect → copy the **transaction pooler** string (port 6543, add `?pgbouncer=true`) and the
   **session pooler** string (port 5432), as in the production setup.
3. GitHub → repo Settings → Secrets and variables → Actions → add:
   - `DEV_DATABASE_URL` — transaction pooler string
   - `DEV_DIRECT_URL` — session pooler string

### 2. Dev Static Web App
1. Azure portal → Create a resource → Static Web App. Plan: **Free**. Same resource group as production
   or a new one.
2. Source: GitHub, this repo, **branch `develop`**. Build preset: Next.js. App location `/`, leave the
   output location empty. (Azure will add its own workflow file to the repo: delete it, we use
   `azure-static-web-apps-dev.yml`.)
3. After creation: resource → Overview → *Manage deployment token* → copy it into a GitHub secret named
   `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV`.
4. Resource → Settings → Environment variables → add the same names the production app has
   (`DATABASE_URL` = the **dev** transaction pooler string, plus any Azure Blob / other settings). The
   app reads these at request time.

### 3. GitHub Environment for production approval
1. Repo Settings → Environments → New environment → `production`.
2. Enable **Required reviewers** and add yourself. Save.

### 4. Branch protection (after CI has run green once)
Repo Settings → Branches → Add rule:
- `main`: require a pull request, require status check **Type-check, lint, test, build**, block force
  pushes and direct pushes.
- `develop`: require status check **Type-check, lint, test, build**; no required reviews.
