# Supabase Git branch association and migration recovery

## What the warning means

The message **“This git branch is not associated with any Supabase Branch. You can open a PR to create a new branch.”** refers to an isolated Supabase preview environment for that Git branch. It does not, by itself, mean that the Next.js deployment or the main Supabase project is disconnected.

The Supabase project currently exposes a branch associated with Git `main`. The latest connector inspection returned `MIGRATIONS_FAILED` for that branch. After the project was restored, Supabase reported `COMING_UP`, while remote table and migration-history reads still timed out. Do not treat that as a successful migration.

## No-cost operating choice

Credi does not create a persistent Supabase branch for every Git branch or pull request. That avoids introducing long-lived database branches and unexpected usage charges.

- Use GitHub pull-request CI for static migration checks and application tests.
- Keep Supabase production migrations associated with Git `main`.
- Use a dedicated isolated Supabase project or a preview branch only when it is explicitly available and its cost has been reviewed.
- Do not point untrusted preview deployments at production write credentials merely to remove this warning.
- The warning can remain on a non-main preview branch without blocking a Vercel Preview. It disappears only when that Git branch is actually associated with a Supabase branch or the preview-branch integration is no longer requested.

## Safe recovery order for `MIGRATIONS_FAILED`

1. Wait until the existing Supabase project is `ACTIVE` and SQL/migration-history reads succeed.
2. Export/backup the current remote migration history and inspect failed deployment details.
3. Compare the remote history with the 211 versioned SQL files currently tracked under `supabase/migrations/`. The repository-level audit is not a substitute for this comparison.
4. Resolve duplicate or missing remote migration versions and SQL drift using Supabase's migration repair/reconciliation process. Do not blindly mark migrations applied or rerun the entire directory.
5. Run the local schema, RLS, and integration tests; then apply only the verified pending migrations to the existing project.
6. Verify tables, functions, Storage policies, Realtime publication and application health after deployment.

## Vercel Preview and Production

Vercel owns the Next.js Preview and Production deployments. Supabase owns database migrations, Auth, RLS, Storage and Realtime. For production, verify that the Vercel project's Production environment uses the intended Supabase project URL and server/public keys. Configure Preview variables separately; never copy service-role credentials into client-visible variables.

Official Supabase references:
- Branching: https://supabase.com/docs/guides/deployment/branching
- Database migrations: https://supabase.com/docs/guides/deployment/database-migrations
