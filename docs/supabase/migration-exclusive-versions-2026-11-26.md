# Supabase migration exclusive-version register — 2026-11-26

## Verified remote snapshot

Projects:
- Production: `fusnmvmveqdzmzohhlzm` — `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003
- Preview: `yjxybhpubxhblfyfzlmk` — `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.011

Read-only migration listings retrieved directly from both projects:
- Production: 231 versions
- Preview: 249 versions
- Shared: 219
- Production-only: 12
- Preview-only: 30

No database mutation was performed by these listing calls.

## Production-only versions

| Version | Remote migration name | Disposition |
|---|---|---|
| 20261106123959 | production_professional_network_and_feed_preferences | Unclassified — inspect SQL and schema effects |
| 20261106130450 | credi_secure_chat_groups_reconciliation | Unclassified — inspect SQL and schema effects |
| 20261106130552 | index_uncovered_foreign_keys_reconciliation | Potential same-name counterpart in Preview; compare full SQL |
| 20261106130607 | restrict_private_operational_tables | Potential same-name counterpart in Preview; compare full SQL |
| 20261106131032 | fix_order_status_history_trigger_schema | Unclassified — inspect SQL and schema effects |
| 20261106131148 | align_live_room_description_not_null | Unclassified — inspect SQL and data preconditions |
| 20261126224654 | align_client_table_privileges | Potential same-name counterpart in Preview; compare full SQL |
| 20261126225508 | align_social_advertising_rls_contract | Potential same-name counterpart in Preview; compare full SQL |
| 20261126225519 | fix_wallet_refund_rpc_security_parity | Potential same-name counterpart in Preview; compare full SQL |
| 20261126225548 | align_checkout_legacy_rpc | Potential same-name counterpart in Preview; compare full SQL |
| 20261126225559 | fix_kyc_private_storage_contract | Potential same-name counterpart in Preview; compare full SQL |
| 20261126225706 | fix_kyc_case_variable_ambiguity | Potential same-name counterpart in Preview; compare full SQL |

## Preview-only versions

| Version | Remote migration name | Disposition |
|---|---|---|
| 20260924134300 | wallet_journals_and_refund_schema | Financial schema — unresolved; compare tables, constraints, triggers and ledger invariants |
| 20260924134854 | settlement_account_bindings_base | Financial/compliance schema — unresolved |
| 20260924134855 | settlement_audit_base | Financial/compliance schema — unresolved |
| 20261002010000 | marketing_ads_and_audiences_core | Unclassified — inspect SQL and data effects |
| 20261002020000 | profile_verification_photos | Identity data — do not discard; inspect Storage/data dependencies |
| 20261002030000 | marketing_metrics_and_social_integrations | Unclassified — inspect SQL and data effects |
| 20261002040000 | restore_financial_trigger_functions | Financial functions/triggers — high-risk; compare function bodies, search_path and ACL |
| 20261003020000 | ai_sessions_core | Unclassified — inspect SQL and data effects |
| 20261012080000 | guard_social_moderation_fields | Security/RLS — inspect exact policy and trigger effects |
| 20261012150000 | enable_live_realtime_publication | LIVE/Realtime configuration — verify environment applicability |
| 20261031183000 | credi_professional_jobs_and_profiles | Unclassified — compare with Production professional network objects |
| 20261101090000 | credi_secure_chat_groups | Unclassified — compare group tables, RPCs and RLS |
| 20261102100000 | social_feed_preferences | Unclassified — compare table, policies and application consumers |
| 20261104040000 | restore_preview_commerce_rls_acl_parity | Security/ACL — high-risk; inspect every grant and policy |
| 20261104040100 | harden_trigger_function_search_paths | Security — inspect each affected function |
| 20261104040200 | restore_credi_live_commerce_schema | LIVE/commerce schema — compare complete object inventory |
| 20261104040300 | platform_owner_profile_guard | Privileged identity control — high-risk; preserve authorization behavior |
| 20261104040400 | fix_credi_pin_generation | Identity/contact data — inspect uniqueness and backfill effects |
| 20261104040500 | restore_missing_preview_private_helpers | Private helper functions — inspect callers, owner, ACL and search_path |
| 20261104040600 | restore_private_identity_profile_photos | Private identity Storage — preserve existing objects and ownership |
| 20261106130555 | index_uncovered_foreign_keys_reconciliation | Potential same-name counterpart in Production; compare full SQL |
| 20261106130610 | restrict_private_operational_tables | Potential same-name counterpart in Production; compare full SQL |
| 20261106130629 | restrict_anon_operation_timeline | Security/RLS — inspect exact grants and policies |
| 20261126224643 | align_client_table_privileges | Potential same-name counterpart in Production; compare full SQL |
| 20261126224746 | provision_compliance_and_marketplace_storage_buckets | Storage provisioning — verify bucket config and object preservation |
| 20261126225456 | align_social_advertising_rls_contract | Potential same-name counterpart in Production; compare full SQL |
| 20261126225518 | fix_wallet_refund_rpc_security_parity | Financial authorization — high-risk; compare function body and ACL |
| 20261126225547 | align_checkout_legacy_rpc | Financial checkout — high-risk; compare overloads and grants |
| 20261126225557 | fix_kyc_private_storage_contract | Identity Storage — preserve ownership and privacy |
| 20261126225704 | fix_kyc_case_variable_ambiguity | KYC function — inspect body and contract |

## Same-name version pairs that need content comparison

The following names appear in both remote ledgers with different version identifiers. Treat them as possible duplicate logical migrations, not as proof of identical SQL:

| Migration name | Production version | Preview version |
|---|---|---|
| index_uncovered_foreign_keys_reconciliation | 20261106130552 | 20261106130555 |
| restrict_private_operational_tables | 20261106130607 | 20261106130610 |
| align_client_table_privileges | 20261126224654 | 20261126224643 |
| align_social_advertising_rls_contract | 20261126225508 | 20261126225456 |
| fix_wallet_refund_rpc_security_parity | 20261126225519 | 20261126225518 |
| align_checkout_legacy_rpc | 20261126225548 | 20261126225547 |
| fix_kyc_private_storage_contract | 20261126225559 | 20261126225557 |
| fix_kyc_case_variable_ambiguity | 20261126225706 | 20261126225704 |

For each pair, compare the complete source SQL and its effects. If the SQL is identical, select one canonical source version and document how the other version is represented; do not automatically mark either version applied or reverted. If SQL differs, retain both as distinct changes until effects are understood.

## Local source comparison for same-name pairs — 2026-11-27

The eight version-pairs listed above were fetched from this PR branch using their exact migration paths and compared byte-for-byte. All 16 files exist on this branch and each same-name pair has identical SQL text:

| Migration name | Production source version | Preview source version | Branch source comparison |
|---|---|---|---|
| index_uncovered_foreign_keys_reconciliation | 20261106130552 | 20261106130555 | Identical |
| restrict_private_operational_tables | 20261106130607 | 20261106130610 | Identical |
| align_client_table_privileges | 20261126224654 | 20261126224643 | Identical |
| align_social_advertising_rls_contract | 20261126225508 | 20261126225456 | Identical |
| fix_wallet_refund_rpc_security_parity | 20261126225519 | 20261126225518 | Identical |
| align_checkout_legacy_rpc | 20261126225548 | 20261126225547 | Identical |
| fix_kyc_private_storage_contract | 20261126225559 | 20261126225557 | Identical |
| fix_kyc_case_variable_ambiguity | 20261126225706 | 20261126225704 | Identical |

**Important scope limitation:** this proves equality of the two local SQL source files in the current PR branch only. It does not prove that either source file is the exact SQL payload originally applied remotely, nor that the migrations are safe to mark reverted/applied. Obtain the original migration contents or a trusted deployment artifact from each environment and compare object/data effects before repairing either ledger.

## Evidence still required before any repair

For every row above, collect:
1. Exact local source path and SHA-256 of the complete SQL file.
2. A reviewed SQL diff between the Production and Preview variants.
3. Before/after schema evidence for all tables, columns, constraints, indexes, triggers, functions, policies, grants, publications, buckets and Storage policies touched.
4. Data preconditions and postconditions, including identity, KYC, wallet and settlement rows where relevant.
5. A classification: promotable, environment-specific, superseded/duplicate, or unresolved.
6. A written repair decision with reviewer and date.

## Backup and execution status

- Both projects are currently active and healthy, but a fresh full pg_dump (schema + data) has not been generated by this workstream.
- The Supabase connector used here exposes migration listings and SQL reads; it does not provide a downloadable full database dump or the official CLI migration-repair command.
- No remote SQL, DDL, grants, data, Storage objects, migration ledger entries, or deployments were changed.
- No db push or migration repair is authorized by this register.

**Gate:** keep PR #103 and its follow-up draft until every version is classified, the two full backups are verified, local db reset and pgTAP pass, and the forward migration plan is reviewed.