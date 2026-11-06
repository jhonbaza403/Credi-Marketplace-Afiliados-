# Production / Preview migration promotion audit — 2026-11-06

## Current remote history (read-only)

- Production project `fusnmvmveqdzmzohhlzm`: **220** recorded migration versions (including the new professional-network/feed migration applied on 2026-11-06).
- Preview project `yjxybhpubxhblfyfzlmk`: **239** recorded migration versions.
- Production has no migration versions absent from Preview.
- Preview has exactly **19** historical versions not recorded in Production after the feature migration was applied directly to Production.
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

Added `supabase/migrations/20261106123959_production_professional_network_and_feed_preferences.sql` to the existing branch. It creates the four Production-missing tables (`jobs`, `job_applications`, `professional_profiles`, `social_feed_preferences`) with their indexes, timestamp trigger, RLS policies, and grants. The migration uses `IF NOT EXISTS` for table/index creation and recreates its named policies/triggers so it can also be applied after the original feature migrations in Preview.

The migration source was verified on GitHub. It was applied successfully to Production through the Supabase migration API and recorded remotely as version `20261106123959`. The four tables were then verified in Production with RLS enabled and policies present. It has not yet been applied to Preview; because its definitions already exist there, the migration is idempotent and can be applied by the normal Preview workflow. Production is now at 220 recorded versions and Preview at 239.

**Deployment blocker remains:** a normal Supabase CLI `db push` to Production would process the 19 earlier pending versions before any newer migration. Do not run it until the intervening history has been reconciled and the remaining substantive migrations reviewed. The feature migration was applied directly and recorded as `20261106123959`; this does not bypass or repair the 19-version historical gap.

The jobs-application workflow intentionally has no client-side UPDATE policy for application decisions; a narrowly scoped server endpoint/RPC is still required before employers can change application status.


---

## Reconciliation update — 2026-11-06, second pass

This section supersedes the earlier counts and statements above where they differ.

### 1. Current remote migration history

After the controlled changes below, the live histories are:

- Production: **223** versions.
- Preview: **242** versions.
- Preview-only versions: **23**.
- Production-only versions: **4**.
- Net count difference: **19**.

The four Production-only versions are:
- `20261106123959 production_professional_network_and_feed_preferences`
- `20261106130450 credi_secure_chat_groups_reconciliation`
- `20261106130552 index_uncovered_foreign_keys_reconciliation`
- `20261106130607 restrict_private_operational_tables`

Preview has three additional environment-specific versions created by the same controlled index/policy/timeline operations:
- `20261106130555 index_uncovered_foreign_keys_reconciliation`
- `20261106130610 restrict_private_operational_tables`
- `20261106130629 restrict_anon_operation_timeline`

The original 20 Preview-only historical versions remain absent from Production. The original four-table Production feature migration and the subsequent direct reconciliations did not rewrite historical records.

### 2. Per-migration classification of the original 20 Preview-only versions

| Migration | Live Production evidence | Classification / safe action |
|---|---|---|
| `20260924134300_wallet_journals_and_refund_schema` | `wallet_journals` and `wallet_refunds` exist | Table presence confirmed; function bodies, grants, indexes and RLS still require exact comparison. Do not replay wholesale. |
| `20260924134854_settlement_account_bindings_base` | `settlement_account_bindings` exists | Table present; constraints, trigger and policies require exact comparison. |
| `20260924134855_settlement_audit_base` | `settlement_approval_audit` and `settlement_payout_audit` exist | Tables present; preserve Production-only settlement functions and compare audit semantics before any change. |
| `20261002010000_marketing_ads_and_audiences_core` | Campaign, audience, ad-set, creative and advertising tables exist | Main objects present; policy/grant/index parity is not certified. |
| `20261002020000_profile_verification_photos` | `profile_verification_photos` exists | Table present; trigger, Storage bucket and policy definitions require exact comparison. |
| `20261002030000_marketing_metrics_and_social_integrations` | Marketing metrics/events and social integration tables exist | Main objects present; trigger/function bodies and RLS/ACL parity remain unverified. |
| `20261002040000_restore_financial_trigger_functions` | Financial reconciliation function exists; shared catalog reports function/trigger drift | **Not certified.** Do not replay: it changes financial functions and order/listing/product triggers. |
| `20261003020000_ai_sessions_core` | `ai_sessions` exists | Main table present; confirm exact owner policy, index and grants before ledger repair. |
| `20261012080000_guard_social_moderation_fields` | Historical file is inert; later Production migration `20261031002051` records the canonical behavior | Superseded mapping; do not replay archived SQL. |
| `20261012150000_enable_live_realtime_publication` | Historical file is inert; later Production migration `20261031002056` records the canonical behavior | Superseded mapping; do not replay archived SQL. |
| `20261031183000_credi_professional_jobs_and_profiles` | `jobs`, `job_applications`, `professional_profiles` now exist in Production | Feature tables were added by `20261106123959`; exact source parity and employer status workflow still need certification. |
| `20261101090000_credi_secure_chat_groups` | `conversation_invitations` and all four group RPCs now exist; RLS enabled | Security migration applied to Production under new version `20261106130450`; the original historical version remains unreconciled. |
| `20261102100000_social_feed_preferences` | `social_feed_preferences` exists in Production | Table was added by `20261106123959`; exact column/policy parity still needs certification. |
| `20261104040000_restore_preview_commerce_rls_acl_parity` | Migration explicitly aligns Preview to Production's baseline | Preview-only reconciliation. Never apply to Production. |
| `20261104040100_harden_trigger_function_search_paths` | Four function search_path attributes are not yet certified as matching | Compare catalog attributes before changing. |
| `20261104040200_restore_credi_live_commerce_schema` | LIVE tables exist; earlier full catalog diff found a `chat_live_rooms.description` nullability difference | Do not replay wholesale; validate column, checks, policies, triggers and realtime separately. |
| `20261104040300_platform_owner_profile_guard` | Guard function exists in Production | Trigger attachment and definition still require exact comparison. |
| `20261104040400_fix_credi_pin_generation` | `generate_credi_pin()` exists in Production and Preview | Function body/ACL differs; do not replace until behavior and grants are compared. |
| `20261104040500_restore_missing_preview_private_helpers` | Named private helpers exist in Production | Existing presence does not prove equal bodies/ACL/search_path; preserve Production-specific settlement helpers. |
| `20261104040600_restore_private_identity_profile_photos` | Photo table exists in Production | Policy, update trigger, Storage bucket settings and grants still need exact comparison. |

### 3. Controlled functional/security changes completed

The following changes were applied remotely and verified:

1. Production: created `jobs`, `job_applications`, `professional_profiles`, and `social_feed_preferences`; RLS and their policies were verified.
2. Production: applied secure Credi Chat group invitations. Verified `conversation_invitations`, four RPC signatures, RLS and one participant-read policy. The unsafe direct membership INSERT policy was removed and client INSERT revoked by the migration.
3. Both projects: added indexes for uncovered foreign keys where the corresponding table/column exists.
4. Both projects: added restrictive client-deny policies to private operational/tax tables; added admin-only SELECT on `operation_events` where present.
5. Preview: revoked anonymous execution of `public.get_credi_operation_timeline(uuid)`, pinned its search_path, and retained authenticated/service_role execution.

### 4. Current advisor results

**Security**
- Production: no RLS-enabled/no-policy finding; no anonymous SECURITY DEFINER finding. Four authenticated SECURITY DEFINER warnings remain for the four group RPCs, which are intentionally authenticated entry points and must retain their internal `auth.uid()` checks. Leaked-password protection remains a Supabase Auth plan/configuration warning.
- Preview: no RLS-enabled/no-policy finding; no anonymous SECURITY DEFINER finding. Eighteen authenticated SECURITY DEFINER warnings remain and require function-by-function authorization/ACL review; do not revoke them indiscriminately because some are application entry points.

**Performance**
- Both projects: no unindexed-foreign-key findings after the index changes.
- Production: 390 unused-index INFO findings; do not delete indexes without workload evidence.
- Preview: 378 unused-index INFO findings, 19 multiple-permissive-policy warnings, and 2 duplicate-index warnings. The permissive-policy overlaps need policy-by-policy moderation review; no blanket policy deletion was performed.

### 5. Migration ledger reconciliation — still open

No historical version was marked applied merely because an object with a matching name exists. The available Supabase connector exposes migration listing, SQL execution and migration application, but does not expose the official `supabase migration repair` operation or an API to set a specific historical version. The direct applications above therefore created new timestamped records instead of pretending to execute the old migration versions.

**Do not run `supabase db push` yet.** The remaining 23 Preview-only versions include substantive function, policy, trigger, LIVE, and security changes, while the four Production-only records are controlled direct applications. The next ledger step must use the official Supabase CLI `migration repair` in a trusted environment after each old migration's complete effects have been verified against the live catalogs. This audit does not authorize changing ledger rows through raw SQL.

### 6. Release status

- No production deployment was run.
- PR #102 and PR #103 were not merged.
- No existing business rows or Storage objects were deleted.
- The remote functional/security changes above are applied, but **full schema parity and historical ledger reconciliation are not certified**.


## Third pass — production order-history trigger repair

A further live definition comparison found a concrete schema defect in Production's `public.record_order_status_change()`: it attempted to insert into legacy columns `old_status`, `new_status`, and `changed_at`, which are not columns in the current `order_status_history` table. The Production trigger also fired on INSERT, although checkout already records the initial event explicitly.

Corrected Production to match the current schema and Preview's update-transition behavior:
- Function now writes `from_status`, `to_status`, `changed_by`, `reason`, and `metadata`.
- `search_path` is pinned to the empty path.
- Trigger now fires only after UPDATE OF status, preventing duplicate order-creation history rows.
- Verified the live function definition and trigger definition after application.
- Source recorded in `supabase/migrations/20261106131032_fix_order_status_history_trigger_schema.sql`.

Current history after this repair:
- Production: **224** versions.
- Preview: **242** versions.
- Preview-only: **23** versions.
- Production-only: **5** versions.
- Net count difference: **18**.

This fixes one verified functional defect, but it does not certify all financial functions/triggers in `20261002040000_restore_financial_trigger_functions`. The remaining financial definitions and grants still require object-by-object comparison.
