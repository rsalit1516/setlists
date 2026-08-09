# Azure Static Web Apps: staging environment quota (Free tier)

The Setlists app (`Setlists` static web app, `Setlists-prod-rg` resource group) runs on the
Azure Static Web Apps **Free tier**. Free tier caps how many concurrent staging (preview)
environments the app can have — one per open PR against `main`, provisioned by
`.github/workflows/azure-static-web-apps-proud-ocean-04af2510f.yml`.

We're intentionally staying on the Free tier rather than upgrading to Standard. This doc
records the failure mode and the recovery steps so it's a quick fix, not a re-investigation,
next time it comes up.

## What it looks like

A PR's "Build and Deploy Job" fails with:

```
This Static Web App already has the maximum number of staging environments (...).
Please remove one and try again.
```

(The `(...)` sometimes prints a stringified .NET `Task` object instead of an actual number —
that's a cosmetic bug in Azure's error message, not something to read into.)

## Why it happens

Two contributing causes, usually together:

1. **The cap itself.** Free tier only allows a handful of concurrent staging environments.
   Opening several PRs in parallel (this repo's worktree-per-issue workflow makes that easy)
   can hit it on its own.
2. **Orphaned environments.** The workflow's `close_pull_request_job` is supposed to tear down
   a PR's staging environment when the PR closes/merges. It doesn't always succeed — the first
   time this happened (2026-08-09), two environments (`51`, `55`) from PRs merged *two days*
   earlier were still sitting there `Ready`, silently eating the quota until a brand new PR's
   deploy got rejected.

## How to diagnose

Requires the `az` CLI, logged in with access to the `Setlists-prod-rg` resource group
(`az login` if needed).

```bash
az staticwebapp environment list -n Setlists -g Setlists-prod-rg -o table
```

Cross-check the listed environments' `SourceBranch` / `PullRequestTitle` against
`gh pr list --repo rsalit1516/setlists --state all` — any environment whose PR is already
merged or closed is orphaned and safe to delete.

## How to fix

Delete each orphaned environment (the `Name` column from the `list` output above, typically
the PR number):

```bash
az staticwebapp environment delete -n Setlists -g Setlists-prod-rg --environment-name <N> --yes
```

Then re-run the failed GitHub Actions job (or just push a new commit to the PR branch) to
retrigger the deploy now that a slot is free:

```bash
gh run rerun <run-id> --repo rsalit1516/setlists --failed
```

## Notes

- This is a known limitation being accepted, not a bug we're fixing in code — see
  [#64](https://github.com/rsalit1516/setlists/issues/64).
- If this starts happening often enough to be a regular interruption, that's the signal to
  revisit the Free-tier decision and upgrade to Standard (higher staging environment cap), or
  to investigate why `close_pull_request_job` intermittently fails to clean up.
