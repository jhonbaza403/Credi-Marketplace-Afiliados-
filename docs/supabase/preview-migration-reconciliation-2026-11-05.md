# Preview migration source reconciliation — 2026-11-05

## Scope and evidence

- Target checked: isolated Supabase Preview project `yjxybhpubxhblfyfzlmk`.
- Preview migration history: 239 versions.
- `main` before this change: 220 SQL migration files.
- Nineteen Preview versions were recorded remotely but lacked corresponding top-level SQL files on `main`.
- The existing branch `feat/credi-ai-operations-console` contains 239 migration files and matches all 239 Preview versions, with no missing, local-only, or duplicate versions.
- Seventeen missing migration files are restored verbatim from that branch.

## Restored SQL files

- `20260924134300_wallet_journals_and_refund_schema`
- `20260924134854_settlement_account_bindings_base`
- `20260924134855_settlement_audit_base`
- `20261002010000_marketing_ads_and_audiences_core`
- `20261002020000_profile_verification_photos`
- `20261002030000_marketing_metrics_and_social_integrations`
- `20261002040000_restore_financial_trigger_functions`
- `20261003020000_ai_sessions_core`
- `20261031183000_credi_professional_jobs_and_profiles`
- `20261101090000_credi_secure_chat_groups`
- `20261102100000_social_feed_preferences`
- `20261104040000_restore_preview_commerce_rls_acl_parity`
- `20261104040100_harden_trigger_function_search_paths`
- `20261104040200_restore_credi_live_commerce_schema`
- `20261104040300_platform_owner_profile_guard`
- `20261104040500_restore_missing_preview_private_helpers`
- `20261104040600_restore_private_identity_profile_photos`

## Two intentionally inert version mappings

- `20261012080000_guard_social_moderation_fields`
- `20261012150000_enable_live_realtime_publication`

Their original SQL remains preserved verbatim as `.sql.disabled` under `docs/supabase/migration-archive/`. The effects are superseded in Production by later applied migrations `20261031002051_guard_social_moderation_fields` and `20261031002056_enable_live_realtime_publication`. Replaying the old definitions after those later versions have already been recorded could regress the Production trigger/publication state. The top-level files are therefore intentionally inert: they restore the missing version-to-file mapping without replaying obsolete SQL. Fresh databases receive the later canonical migrations.

## Safety and remaining verification

- This change adds migration source files and this reconciliation record only.
- No SQL was executed against either Supabase project.
- No migration history was repaired or marked applied.
- No Production schema, rows, credentials, or settings were changed.
- Production does not currently record these 19 Preview versions. Do not run a Production `db push` from this branch until every Preview-origin migration has been separately reviewed for Production applicability.
- After integration, compare Preview again and require zero remote versions missing locally, zero duplicate version prefixes, and zero local-only versions. A filename match alone does not prove that the Preview schema is healthy; verify Supabase status and run the normal SQL/CI checks.
