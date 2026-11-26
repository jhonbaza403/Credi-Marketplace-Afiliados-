# Production vs Preview schema and migration reconciliation — 2026-11-05

## Direct comparison

- Supabase Preview `yjxybhpubxhblfyfzlmk`: 239 migration versions; 165 public tables.
- Supabase Production `fusnmvmveqdzmzohhlzm`: 219 migration versions; 160 public tables.
- Preview has 20 migration versions not recorded in Production.
- Production has no migration version absent from Preview.
- Comparing the 160 public tables common to both projects found no column differences in the verbose table inventory.
- The only public tables present in Preview but absent from Production are:
  - `jobs`
  - `job_applications`
  - `professional_profiles`
  - `conversation_invitations`
  - `social_feed_preferences`

## Exact 20 Preview versions not recorded in Production

### Functional gaps confirmed in Production

1. `20261031183000_credi_professional_jobs_and_profiles`
   - Missing tables: `jobs`, `job_applications`, `professional_profiles`.
   - Missing trigger function: `touch_credi_jobs_updated_at`.
2. `20261101090000_credi_secure_chat_groups`
   - Missing table: `conversation_invitations`.
   - Missing RPCs: `create_credichat_group_conversation`, `invite_credichat_group_member`, `list_my_credichat_group_invitations`, `respond_credichat_group_invitation`.
   - Production still has the legacy `conversation_members_insert` policy; the migration removes direct membership INSERT and routes group membership through controlled SECURITY DEFINER RPCs.
3. `20261102100000_social_feed_preferences`
   - Missing table: `social_feed_preferences`.

These three source migrations are consolidated into the new forward migration:
`supabase/migrations/20261105210000_promote_preview_professional_chat_feed_features.sql`.

### Effects already represented in Production

The following versions are not in Production's migration history, but their principal schema objects/functions were found in the Production catalog; do not replay them as a batch:

- `20260924134300_wallet_journals_and_refund_schema`
- `20260924134854_settlement_account_bindings_base`
- `20260924134855_settlement_audit_base`
- `20261002010000_marketing_ads_and_audiences_core`
- `20261002020000_profile_verification_photos`
- `20261002030000_marketing_metrics_and_social_integrations`
- `20261002040000_restore_financial_trigger_functions`
- `20261003020000_ai_sessions_core`
- `20261104040000_restore_preview_commerce_rls_acl_parity`
- `20261104040100_harden_trigger_function_search_paths`
- `20261104040200_restore_credi_live_commerce_schema`
- `20261104040300_platform_owner_profile_guard`
- `20261104040400_fix_credi_pin_generation`
- `20261104040500_restore_missing_preview_private_helpers`
- `20261104040600_restore_private_identity_profile_photos`

### Superseded historical versions

- `20261012080000_guard_social_moderation_fields` is superseded in Production by `20261031002051_guard_social_moderation_fields`.
- `20261012150000_enable_live_realtime_publication` is superseded in Production by `20261031002056_enable_live_realtime_publication`.

Their original SQL should not be replayed over the later canonical definitions.

## Safety / rollout

- This report and the new migration are source-control changes only.
- No SQL was executed against Production or Preview during this reconciliation.
- No remote migration was marked applied and no rows were copied, updated or deleted.
- The new migration is a draft for review; do not deploy until the UI's group-invitation flow, table grants, RLS and RPC permissions are validated.
- Do not run `supabase db push` with all 19 Preview-only source migrations against Production.
- Migration-history count equality is not the target. The target is equivalent intended schema/security behavior, with Production-specific forward migrations and no replay of superseded SQL.
