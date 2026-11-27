# Production / Preview ledger reconciliation — 2026-11-06

## Remote migration ledger snapshot

Projects:
- Production: `fusnmvmveqdzmzohhlzm`
- Preview: `yjxybhpubxhblfyfzlmk`

Read-only Supabase migration listings:
- Production: **225** recorded versions.
- Preview: **242** recorded versions.
- Shared: **219**.
- Production-only: **6**.
- Preview-only: **23**.
- Net difference: **17**.

The current repository `main` catalog has 248 SQL migration files with 248 unique numeric prefixes. The PR branch has 250 files with 250 unique prefixes. All 225 Production and 242 Preview remote versions resolve to one local file on both branches. There are no missing source files and no duplicate local prefixes. This closes the local source-catalog mismatch only; it does not reconcile remote ledgers.

## Read-only schema/function findings

A live catalog comparison was run across Production and Preview. No row data was changed.

### Exact matches in inspected definitions
The following objects match across both projects for the inspected columns, defaults, nullability, constraints, indexes, RLS, policies and triggers:
- `wallet_journals`
- `wallet_refunds`
- `settlement_account_bindings`
- `settlement_approval_audit`
- `settlement_payout_audit`

The five promoted professional/chat/feed tables were previously compared in the #103 audit and were found identical for columns, defaults, constraints, indexes, policies and relevant triggers:
- `jobs`
- `job_applications`
- `professional_profiles`
- `social_feed_preferences`
- `conversation_invitations`

### Marketing precision differences
The marketing schemas are mostly aligned in the inspected table properties, but these column types differ:
- `marketing_ad_sets.daily_budget`: Production `numeric(20,2)`; Preview `numeric`.
- `marketing_campaigns.daily_budget` and `lifetime_budget`: Production `numeric(20,2)`; Preview `numeric`.
- `marketing_conversion_events.event_value`: Production `numeric(20,8)`; Preview `numeric`.
- `marketing_experiment_variants.allocation_percent`: Production `numeric(5,2)`; Preview `numeric`.

Several marketing name CHECK expressions are textually different (`TRIM(BOTH FROM name)` vs `btrim(name)`) but semantically equivalent.

Before changing Preview precision, run read-only range/scale preflight queries to prove existing values fit the Production precision. Do not narrow numeric columns without that check.

### Wallet index difference
- Production has `wallet_ledger_journal_currency_idx` on `(journal_id, currency)`.
- Preview does not have that index.
- Other inspected `wallet_ledger` columns, constraints, policies and triggers match.

This index can be added to Preview after confirming the same name does not already exist and assessing the write/lock impact.

### Table-level grants
The inspected grant diff found eight extra explicit Preview grants for `anon`: SELECT, INSERT, UPDATE, DELETE on each of:
- `social_accounts`
- `social_publications`

Production does not grant those table privileges to anon. These tables use authenticated owner/admin RLS policies. Revoke the extra Preview anon grants in a reviewed migration; do not alter authenticated or service_role grants.

### Financial function differences — do not ledger-repair yet
The following inspected functions matched:
- `approve_settlement_allocation(uuid)`
- five-argument `create_pending_order_batch(uuid,jsonb,text,text,text)`
- `protect_order_item_financial_data()`
- `reconcile_settlement_financials()`
- `record_order_status_change()`
- `set_compliance_updated_at()`
- `set_listing_offers_updated_at()`
- `set_listings_updated_at()`
- `validate_non_negative_money()`
- `validate_positive_quantity()`

Material or potentially relevant differences remain:
1. Four-argument `create_pending_order_batch(uuid,jsonb,text,text)`: Production and Preview function bodies, `search_path` and ACL differ. Production has `search_path=public` and postgres-only execute; Preview has empty `search_path`, postgres + service_role execute, and a price validation not present in Production. Its inventory reservation logic also differs. This is checkout/stock/financial behavior and requires explicit design review plus transaction tests; do not copy either function blindly.
2. `private.validate_wallet_journal_balance(uuid)`: function bodies differ, though both are SECURITY DEFINER with empty search_path and postgres-only execute.
3. `private.enforce_posted_wallet_journal_balance()`: function bodies differ, though both are SECURITY DEFINER with empty search_path and postgres-only execute.
4. `set_social_updated_at()`: body formatting/assignment operator differs (`=` vs `:=`); both use empty search_path and identical execute ACL. Confirm semantics in the source before considering it equivalent.

These findings mean `20261002040000_restore_financial_trigger_functions` must not be marked applied in Production based solely on table/function names or a partial object comparison.

## Version-repair strategy

The official Supabase CLI `migration repair` changes the migration ledger only; it does not apply or reverse SQL. Only mark a version `applied` after its full schema/function/trigger/policy/grant/storage effects are proven present in the target. For versions with missing or different effects, first prepare and test a forward corrective migration, then reconcile the appropriate history using the official CLI.

Never:
- edit `supabase_migrations.schema_migrations` directly;
- run `supabase db push` against the full historical catalog before classifying all pending versions;
- mark financial/security migrations as applied based only on table existence;
- reset Production or delete commercial rows, identity photos, wallet/settlement data, or Storage objects.

The available Supabase integration in this session can list migrations, run SQL and apply new migrations, but does not expose the official `supabase migration repair` CLI operation. No remote DDL or ledger mutation was performed during this audit.

## Git branch / PR consolidation

Required product work remains in several active PRs and must not be dropped solely because branches are numerous:
- #103 — migration/source and Production/Preview parity (keep draft until DB/function review and CI pass).
- #90 — publishing validation and LIVE transport messaging.
- #94 — Cloudflare Stream multiprotocol/replay adapter.
- #97 and #99 — social-commerce shell, jobs and governed AI operations; consolidate overlapping UI/routes before one is merged.
- #71 — moderation security controls (review carefully).
- #76 — Twilio SMS/webhook delivery; currently based on #74.
- #80 and #98 — authentication and platform-owner entitlement.
- #101 — truthful health/integration status.

PR #89 contains useful LIVE/Chat/Twilio work but also Cloudflare Workers/OpenNext deployment artifacts, which conflict with the current Vercel deployment decision. Salvage provider features into #90/#94/#76 before closing it; do not merge its deployment changes wholesale.

Merged/obsolete branches that can be deleted after confirming their changes are reachable from main:
- #102 migration source restoration (merged).
- #67 mobile navigation contrast (merged).
- #82 and #83 migration support fixes (merged).
- #91 old navigation source (closed; replaced by #92).
- #84 duplicate support-version PR (closed in this work session; #83 was already merged).

The GitHub connector available in this session does not expose a branch-delete operation. Closing a PR is not deleting its branch. Therefore no GitHub branch refs were deleted by this audit. Production's Supabase default branch `main` is also not a cleanup candidate; it is the production project branch.


## Supplemental live comparison — six additional tables

A second read-only comparison covered `marketing_daily_metrics`, `marketing_events`, `social_accounts`, `social_publications`, `profile_verification_photos`, and `ai_sessions`.

- `profile_verification_photos` and `ai_sessions`: inspected table definitions match.
- `marketing_daily_metrics.spend` and `revenue`: Production `numeric(20,2)`; Preview `numeric`.
- `marketing_events.value`: Production `numeric(20,8)`; Preview `numeric`.
- `social_accounts_owner_all` and `social_publications_owner_all`: policy expressions differ only by an extra nested `SELECT` around `auth.uid()` in Production; both are restricted to authenticated owner/admin checks. Do not rewrite unless it is needed for a deliberate RLS performance cleanup.
- The earlier grant comparison still shows Preview-only explicit `anon` table grants on both social tables. Remove those only in a reviewed forward migration after confirming the application uses authenticated access as intended.

Together with the earlier marketing comparison, the following Preview columns remain wider/unconstrained than Production and require a data range/scale preflight before any narrowing: `marketing_ad_sets.daily_budget`, `marketing_campaigns.daily_budget`, `marketing_campaigns.lifetime_budget`, `marketing_conversion_events.event_value`, `marketing_experiment_variants.allocation_percent`, `marketing_daily_metrics.spend`, `marketing_daily_metrics.revenue`, and `marketing_events.value`.


## Live reconciliation addendum — 2026-11-26 (read-only snapshot)

This addendum supersedes the older migration-count snapshot above. It records a later direct read-only comparison; it does not mark any version repaired or applied.

| Evidence | Production | Preview |
|---|---:|---:|
| Remote versions recorded | 231 | 249 |
| Shared versions | 219 | 219 |
| Environment-exclusive versions | 12 | 30 |
| Remote versions without source file on main | 6 | 7 |

The current main migration catalog contains 248 SQL files with 248 unique version prefixes. The latest comparison therefore still identifies 13 remote version records without a matching source file in main (6 Production + 7 Preview). Candidate source files are present in the draft PR #103 workstream, but they must be checked by exact version prefix, full SQL content, and resulting schema effects before they are treated as canonical.

### Required reconciliation register

The per-version register must be completed from fresh CLI exports before any ledger operation. The minimum columns are:

| Project | Version | Local source path | SHA-256 | Schema effects verified | Data effects verified | Classification | Repair decision |
|---|---|---|---|---|---|---|---|
| Production | pending exact export | pending | pending | pending | pending | unclassified | none |
| Preview | pending exact export | pending | pending | pending | pending | unclassified | none |

Allowed classifications:
- **Promotable:** reviewed, environment-independent SQL with a tested forward migration plan.
- **Environment-specific:** preview/test configuration or data that must not be promoted.
- **Superseded/duplicate:** its effects are already represented by a later canonical migration; requires documented proof and no blind replay.
- **Unresolved:** missing SQL, uncertain effects, financial/security behavior, or any mismatch requiring schema/data inspection.

### Backup and safety status

- A fresh full pg_dump (schema + data) for both hosted projects has not been produced by this workstream.
- No remote schema diff, migration repair, db push, DDL, grant change, or data mutation is authorized or claimed here.
- Do not use the older 225/242 and 6/23 counts as the current baseline.
- Do not infer that a missing local source is safe to mark applied; first compare every object, trigger, policy, grant, bucket, and data transformation created by that version.
- The official CLI must be run separately against Production and Preview after verified backups. Preserve the exports, CLI version, project ref, timestamp, branch commit, and output logs as the audit evidence.

**Closure gate:** every remote version has one canonical source or an explicit environment-specific/obsolete disposition; both supabase db reset and supabase test db pass from the canonical branch; no remote ledger repair is performed until the register is complete and reviewed.
