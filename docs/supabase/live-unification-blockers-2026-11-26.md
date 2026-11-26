# Credi Marketplace — live unification blockers

Audit date: 2026-11-26  
PR: #103 — `fix/production-preview-feature-parity-20261105`

## Target architecture and invariant

- Vercel is the application/deployment platform.
- Supabase is the shared backend contract, with isolated Production and Preview projects.
- Stripe remains the payment processor.
- Cloudflare Stream remains the LIVE delivery service; Cloudflare Workers are not a deployment target.
- CREDI INTELLIGENCE orchestrates product capabilities.
- Environments share schema, API/RPC contracts, authorization semantics, financial invariants and deployable function versions. They do **not** share user data, credentials, secrets, or live payment state.

## Live project state

| Check | Production | Preview |
|---|---:|---:|
| Project ref | `fusnmvmveqdzmzohhlzm` | `yjxybhpubxhblfyfzlmk` |
| Health | ACTIVE_HEALTHY | ACTIVE_HEALTHY |
| PostgreSQL | 17.11 | 17.11 |
| Registered migrations | 225 | 242 |
| Public tables | 165 | 165 |
| Public RLS-disabled tables | 0 | 0 |
| Public policies | 317 | 323 |
| Authenticated-executable SECURITY DEFINER functions | 4 | 18 |

Migration ledger delta: 219 shared; 6 Production-only; 23 Preview-only. Every remote version was previously confirmed to have a matching local source file in PR #103, but this is source coverage, not ledger reconciliation. Never replay all 29 versions or alter `supabase_migrations.schema_migrations` with direct SQL.

## Exact differences and required action

### 1. Client table grants

Preview currently grants `anon` SELECT/INSERT/UPDATE/DELETE on `social_accounts` and `social_publications`; Production does not. Preview also has direct client privileges on wallet journals/refunds and settlement/audit tables, while their RLS policies deny client rows. RLS is not a substitute for least-privilege table grants.

Prepared forward-only migration:
`20261126210000_align_client_table_privileges.sql`

It revokes only anon access from social integration tables, and client access from server-only wallet/settlement tables. It preserves authenticated owner-scoped social access and service-role access. It asserts the resulting grants and does not touch rows. A pgTAP contract update checks the two social tables.

Status: committed to PR #103; hosted projects have not been changed. Run full local migration reset/pgTAP and Preview verification before applying. Promote to Production only after backup/restore evidence and application-role smoke tests.

### 2. Social and LIVE RLS

Public feed posts, reels and stories require published/public/approved (and stories not expired). The existing migration `20261125020000_harden_social_and_live_rls.sql` encodes this, but the live policy inventory still contains older per-action owner policies and the Preview advisor reports 19 permissive overlaps. Ads require a separate check: Production's public advertisement policy includes `moderation_status='approved'`; do not assume the feed migration fixes advertisements in both environments.

Do not bulk-drop policies. For each table, derive the intended SELECT/INSERT/UPDATE/DELETE matrix, retain owner/admin behavior, then test anon, owner, other authenticated user, moderator and platform admin roles. Duplicate indexes remain until index definitions, dependencies, and workload usage are checked.

### 3. Wallet, checkout and financial integrity

- `public.wallet_refund_order(uuid,numeric,text,text)`: Production is SECURITY INVOKER; Preview is SECURITY DEFINER. Both expose authenticated and service_role execution. The private implementation is SECURITY DEFINER with empty search_path but its ACL differs. Do not deploy the proposed wrapper migration until every service_role caller and RPC path is traced.
- `create_pending_order_batch(uuid,jsonb,text,text)`: function body, search_path and ACL differ. The 5-argument version's body hash matches in both projects, but the 4-argument overload does not.
- Private wallet-journal validation functions differ in body hashes between projects.
- Preview lacks Production's `wallet_ledger_journal_currency_idx`.
- Marketing numeric precision preflight returned zero incompatible rows for all eight columns in both projects. This supports a controlled type-alignment migration, not an unreviewed bulk schema push.

Required tests: concurrent checkout, stock reservation/release, rollback, idempotent retries, duplicate Stripe webhooks, refund ceilings, posted journal balance, settlement approval/payout audit and role-specific access. Do not change live balances or replay payment events during migration.

### 4. Storage and upload security

Preview is missing the three buckets present in Production: `marketplace-media`, `kyc-documents`, `kyb-documents`. The existing bucket migration is additive and checks configuration mismatches rather than overwriting bucket rows. Before promotion, verify every bucket's privacy, MIME allow-list, size limit, RLS policies, object counts and sample signed download/upload behavior. Never copy or delete user objects to obtain parity.

The deployed `media-upload` functions differ:
- Production v10, SHA-256 `be80998759454ab5644bfe27b0c5c163013af85a25e2119edea4214d76159e2c`.
- Preview v2, SHA-256 `329f4a0a112432487edc9649b43976d6f4e0d08309efb8a11c937b6b0a765f52`.

Both currently trust the request's client-supplied `fileSize` for per-plan quota checks before issuing a signed upload URL. That value is not proof of the uploaded object's actual size; a user can under-report it. The 500 MiB bucket cap does not enforce each plan's lower quota. Design and test server-enforced byte counting or a post-upload validation/quarantine flow before promoting either version.

Production's `kyc-upload` v2 uses bucket `credi-kyc-private`, while the current application compliance routes use `kyc-documents` and `kyb-documents`. It is not safe to copy this legacy function into Preview. Reconcile the live function contract with the current API routes and private buckets first. Production's public `health` function is also absent from Preview; deploy only if the health endpoint is part of the agreed operational contract.

### 5. Auth and secrets

Production's leaked-password protection remains disabled. This is an Auth configuration control, not a SQL migration. Enable it through Supabase Auth settings after reviewing any plan/availability constraints, then verify the setting in both environments. Keep project-specific keys, Stripe webhook secrets, Cloudflare Stream credentials, LiveKit secrets and service-role keys isolated. Never copy Production secrets into Preview or store them in migration files.

### 6. Migration ledger reconciliation

The 29 ledger-exclusive versions must be classified by their actual effect, not their filename. The 6 Production-only versions and 23 Preview-only versions include both schema features and later repairs. Some schema objects already exist in both projects, meaning replay may fail, overwrite a corrected function/trigger, or duplicate behavior. In particular, preserve the UPDATE-only `record_order_status_change()` trigger correction; an earlier migration defines INSERT+UPDATE and can regress it if replayed.

Use the pinned Supabase CLI version and `supabase migration repair` only after a signed-off per-version effect matrix proves that each version's effects already exist. No direct SQL edits to the migration ledger. No `db push` until all pending migrations are reviewed in order against a verified backup and a tested rollback plan.

## Deployment gates

1. Read-only inventory + verified backup/restore evidence for each environment.
2. Local PostgreSQL reset applies the complete catalog and all pgTAP contracts pass.
3. Preview-only forward migration passes role-based RLS/grant tests and application smoke tests.
4. Preview functions and secrets are reconciled and end-to-end upload/checkout/LIVE flows pass.
5. Production promotion is limited to reviewed forward-only migrations; re-read schema, grants, ledgers, advisors and key business invariants afterwards.
6. Vercel Production deploy is approved only after Preview acceptance; Stripe stays in test mode until payment/refund reconciliation and duplicate-webhook tests pass.

## Current disposition

- New least-privilege migration and tests are committed to PR #103.
- Vercel status on the new head is green; this is not evidence that the new SQL has passed CI or been applied.
- No hosted SQL migration, ledger repair, Storage mutation, Edge Function deployment, Auth setting change, Production deployment or data deletion was performed in this audit.
- PR #103 remains Draft and unmerged.
