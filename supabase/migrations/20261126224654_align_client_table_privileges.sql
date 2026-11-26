BEGIN;

-- Preview had explicit anon table grants that Production did not have.
-- Remove only anonymous access from connected-account metadata and publication
-- records. Preserve authenticated owner-scoped access and service_role access.
REVOKE ALL PRIVILEGES ON TABLE
  public.social_accounts,
  public.social_publications
FROM anon;

-- Wallet journals, refund records and settlement/audit tables are server-only.
-- Their RLS deny policies remain in place; remove direct client SQL privileges
-- while preserving postgres/service_role access for controlled server workflows.
REVOKE ALL PRIVILEGES ON TABLE
  public.wallet_journals,
  public.wallet_refunds,
  public.settlement_account_bindings,
  public.settlement_approval_audit,
  public.settlement_payout_audit
FROM anon, authenticated;

DO $contract$
BEGIN
  IF has_table_privilege('anon', 'public.social_accounts', 'SELECT')
     OR has_table_privilege('anon', 'public.social_accounts', 'INSERT')
     OR has_table_privilege('anon', 'public.social_accounts', 'UPDATE')
     OR has_table_privilege('anon', 'public.social_accounts', 'DELETE')
     OR has_table_privilege('anon', 'public.social_publications', 'SELECT')
     OR has_table_privilege('anon', 'public.social_publications', 'INSERT')
     OR has_table_privilege('anon', 'public.social_publications', 'UPDATE')
     OR has_table_privilege('anon', 'public.social_publications', 'DELETE') THEN
    RAISE EXCEPTION 'ANON_SOCIAL_TABLE_PRIVILEGE_REMAINS';
  END IF;

  IF has_table_privilege('anon', 'public.wallet_journals', 'SELECT')
     OR has_table_privilege('authenticated', 'public.wallet_journals', 'SELECT')
     OR has_table_privilege('anon', 'public.wallet_refunds', 'SELECT')
     OR has_table_privilege('authenticated', 'public.wallet_refunds', 'SELECT')
     OR has_table_privilege('anon', 'public.settlement_account_bindings', 'SELECT')
     OR has_table_privilege('authenticated', 'public.settlement_account_bindings', 'SELECT')
     OR has_table_privilege('anon', 'public.settlement_approval_audit', 'SELECT')
     OR has_table_privilege('authenticated', 'public.settlement_approval_audit', 'SELECT')
     OR has_table_privilege('anon', 'public.settlement_payout_audit', 'SELECT')
     OR has_table_privilege('authenticated', 'public.settlement_payout_audit', 'SELECT') THEN
    RAISE EXCEPTION 'CLIENT_FINANCIAL_TABLE_PRIVILEGE_REMAINS';
  END IF;
END;
$contract$;

COMMIT;
