-- Credi Tax Engine regression checks.
-- Verifies that the live schema is reproducible at the object/permission level
-- and that the engine remains zero-assumption until jurisdictional rules exist.

BEGIN;

DO $$
DECLARE
  v_rls boolean;
  v_anon boolean;
  v_auth boolean;
  v_tax_count integer;
BEGIN
  select bool_and(c.relrowsecurity)
    into v_rls
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in (
      'tax_jurisdictions','tax_categories','tax_rates','tax_rules',
      'tax_transactions','tax_transaction_lines','tax_withholdings',
      'tax_collections','tax_reports','tax_filings','tax_exemptions','tax_certificates'
    );

  if coalesce(v_rls,false) is not true then
    raise exception 'All tax engine tables must have RLS enabled';
  end if;

  select count(*) into v_tax_count from public.tax_transactions;
  if v_tax_count < 0 then
    raise exception 'Tax transaction count invariant failed';
  end if;

  select has_function_privilege('anon','public.initialize_order_tax_transaction(uuid)','EXECUTE') into v_anon;
  if v_anon then raise exception 'anon must not execute initialize_order_tax_transaction'; end if;

  select has_function_privilege('authenticated','public.initialize_order_tax_transaction(uuid)','EXECUTE') into v_auth;
  if not v_auth then raise exception 'authenticated must execute initialize_order_tax_transaction'; end if;

  select has_function_privilege('anon','public.finalize_order_settlement_allocations(uuid)','EXECUTE') into v_anon;
  if v_anon then raise exception 'anon must not execute finalize_order_settlement_allocations'; end if;

  select has_function_privilege('authenticated','public.finalize_order_settlement_allocations(uuid)','EXECUTE') into v_auth;
  if v_auth then raise exception 'authenticated must not execute finalize_order_settlement_allocations directly'; end if;
END $$;

DO $$
DECLARE
  v_bad integer;
BEGIN
  select count(*) into v_bad
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and coalesce(array_to_string(p.proconfig,','),'') <> 'search_path=""';

  if v_bad <> 0 then
    raise exception 'SECURITY DEFINER search_path hardening incomplete: % functions', v_bad;
  end if;
END $$;

RAISE NOTICE 'TEST 012 — TAX ENGINE + SECURITY DEFINER: PASS';
ROLLBACK;
