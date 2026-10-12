# Supabase migrations — Credi Marketplace

## Source of truth

- SQL changes live in `supabase/migrations/`.
- The target Supabase project for this repair is `fusnmvmveqdzmzohhlzm` (project name `supabase-cyan-ribbon`). Confirm the target project before running any remote migration command; this repository has previously referenced more than one Supabase project.
- `supabase/config.toml` `project_id` is the local CLI project slug. Do not replace it with a remote project ref merely because the strings differ; link the CLI explicitly to the intended project when operating remotely.

## Immutable history

- Never rename, delete, reorder, or rewrite a migration version that has already been applied remotely just to make the directory look tidy.
- If an applied version is missing locally, recover its exact SQL from the authoritative migration history and restore a file with the matching version.
- If two local files share a version and one is not yet applied remotely, give the unapplied migration a new, unique timestamp version. Do not alter the version of the already-applied migration.
- Do not mark a migration as applied or repair history with fabricated SQL. Reconcile against the database's recorded history first.

## Required checks before merging

1. Compare all remote migration versions with local filenames.
2. Require zero remote versions missing locally.
3. Require zero duplicate local version prefixes.
4. Review every local-only migration as a proposed schema change; inspect target objects and dependencies before applying it.
5. Run lint, typecheck, unit tests, E2E, build, secret scanning, dependency scanning, SAST, and preview checks.
6. After integration, inspect Supabase branch status and logs. Do not declare recovery until `MIGRATIONS_FAILED` is cleared and the schema/migration history are verified.

## Deployment safety

- Do not reset production, drop schemas, delete data, or bulk-mark migrations applied as a shortcut.
- Apply schema changes only after review and CI pass, using the Supabase migration workflow against the confirmed target project.
- Keep the production and preview project refs explicit in CI secrets/configuration; never infer the target from a local slug.
- Preserve the existing commerce, affiliate, B2B, chat, financial, security, and observability schemas. Consolidation must not remove existing product functionality.

## Current repair snapshot (2026-10-12)

- Restored five migration files already recorded remotely but absent from the repository.
- Renamed the unapplied support/quality migration from duplicate version `007` to `20261012013000`.
- Compared 210 remote versions against local files: zero remote versions missing locally and zero duplicate local versions.
- The support/quality migration is the sole local-only version at this snapshot. Its tables must be reviewed and then applied through the approved workflow.
- Supabase branch status still needs to be rechecked after integration; a clean filename comparison alone does not prove the remote branch is healthy.
