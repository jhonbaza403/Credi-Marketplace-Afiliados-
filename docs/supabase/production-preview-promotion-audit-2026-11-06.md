# Production / Preview migration promotion audit — 2026-11-06

## Current remote history (read-only)

- Production project `fusnmvmveqdzmzohhlzm`: **219** recorded migration versions.
- Preview project `yjxybhpubxhblfyfzlmk`: **239** recorded migration versions.
- Production has no migration versions absent from Preview.
- Preview has exactly **20** versions not recorded in Production.
- This is separate from PR #102's source-reconciliation scope: that PR restored 19 files that were missing from the previous `main` catalog (17 substantive files plus two inert historical mappings). Do not conflate "missing from main" with "not recorded in Production".

## Production schema spot-check (read-only)

The following objects created or referenced by Preview-origin migrations were found in Production already:
- Wallet: `wallet_journals`, `wallet_refunds`.
- Settlement: `settlement_account_bindings`, `settlement_approval_audit`, `settlement_payout_audit`.
- Marketing: `marketing_audiences`, `marketing_campaigns`, `marketing_ad_sets`, `marketing_creatives`, `marketing_ads`, `marketing_experiments`, `marketing_experiment_variants`, `marketing_conversion_events`, `marketing_daily_metrics`, `marketing_events`.
- Profile/social/AI: `profile_verification_photos`, `social_accounts`, `social_publications`, `ai_sessions`.

These objects existing does **not** prove that every column, constraint, index, trigger, RLS policy, grant, or function body matches the migration source. Therefore, do not replay their historical migrations or mark them applied based only on table existence.

## Confirmed Production schema gaps

The following tables exist in Preview but were not found in Production during the same catalog query:
- `public.jobs`
- `public.job_applications`
- `public.professional_profiles`
- `public.social_feed_preferences`

Their source migrations are:
- `20261031183000_credi_professional_jobs_and_profiles.sql`
- `20261102100000_social_feed_preferences.sql`

These are the clearest candidates for a Production feature rollout, but the complete column/constraint/index/trigger/RLS/grant definitions and application routes must be reviewed together before release. In particular, the jobs migration deliberately does not grant employers direct UPDATE access to job applications; a status-review RPC or server endpoint is still needed if the product exposes that workflow.

## Historical / Preview-specific migrations

- `20261012080000_guard_social_moderation_fields` and `20261012150000_enable_live_realtime_publication` are inert top-level mappings in the restored catalog. Their original SQL is preserved under `docs/supabase/migration-archive/*.sql.disabled`.
- The corresponding behavior is superseded in Production by the later recorded versions `20261031002051` and `20261031002056`. Do not restore/replay the archived SQL.
- `20261104040000_restore_preview_commerce_rls_acl_parity` explicitly describes aligning Preview to the already-existing Production security baseline. It is not a Production rollout migration and must not be run against Production.
- The remaining Preview-only migration versions include security, helper-function, LIVE-commerce, profile-guard, PIN, and identity-photo reconciliation. They require object-by-object definition comparison; names/counts alone cannot classify them as disposable or production-safe.

## Release decision

1. Keep all 239 Preview migration source files in the shared catalog. Deleting a version already recorded in Preview recreates `Remote migration versions not found in local migrations directory.`
2. Do not create a second set of duplicate SQL migrations with new timestamps. Supabase CLI uses one ordered migration catalog; a separate "production" filename is not automatically environment-scoped and may execute in Preview too.
3. Do not run `supabase db push` against Production from the 239-file catalog. It could replay older migrations whose effects already exist out-of-band or apply Preview reconciliation changes.
4. First complete exact schema comparison for the 16 remaining substantive migrations after excluding the two inert mappings and the two feature-gap migrations. Then prepare a controlled promotion/ledger-reconciliation plan, preserving data and reviewing every policy/grant/function change.
5. No remote SQL, migration repair, Production schema change, deployment, merge, or PR closure was performed for this audit.

## Current GitHub work

- PR #102 remains open and draft on `fix/preview-migration-source-parity-20261105`.
- This audit is documentation only; it does not authorize merge or remote database changes.


## Follow-up: production feature migration prepared (2026-11-06)

Added `supabase/migrations/20261106120000_production_professional_network_and_feed_preferences.sql` to the existing branch. It creates the four Production-missing tables (`jobs`, `job_applications`, `professional_profiles`, `social_feed_preferences`) with their indexes, timestamp trigger, RLS policies, and grants. The migration uses `IF NOT EXISTS` for table/index creation and recreates its named policies/triggers so it can also be applied after the original feature migrations in Preview.

The migration source was verified on GitHub. It has **not** been executed against Preview or Production, and the migration ledger was not changed. Production remains at 219 recorded versions and Preview at 239.

**Deployment blocker remains:** a normal Supabase CLI `db push` to Production would process the 20 earlier pending versions before this new migration. Do not run it until the intervening history has been reconciled and the remaining substantive migrations reviewed. The migration file alone does not bypass or repair that history gap.

The jobs-application workflow intentionally has no client-side UPDATE policy for application decisions; a narrowly scoped server endpoint/RPC is still required before employers can change application status.
