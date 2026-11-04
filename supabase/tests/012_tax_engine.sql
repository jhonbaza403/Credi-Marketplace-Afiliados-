-- Credi Tax Engine regression checks.
-- Tests actual non-negative amount constraints with rejected fixture writes.

BEGIN;

DO $$
DECLARE
  v_table_count integer;
  v_rls_count integer;
  v_anon boolean;
  v_auth boolean;
  v_rejected boolean;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE c.relrowsecurity)
    INTO v_table_count, v_rls_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'tax_jurisdictions','tax_categories','tax_rates','tax_rules',
      'tax_transactions','tax_transaction_lines','tax_withholdings',
      'tax_collections','tax_reports','tax_filings','tax_exemptions','tax_certificates'
    )
    AND c.relkind IN ('r', 'p');

  IF v_table_count <> 12 THEN
    RAISE EXCEPTION 'Tax engine schema must contain all 12 expected tables; found %', v_table_count;
  END IF;
  IF v_rls_count <> 12 THEN
    RAISE EXCEPTION 'RLS must be enabled on all 12 tax engine tables; enabled %', v_rls_count;
  END IF;

  -- Each negative amount is sent through the real CHECK constraint. If the
  -- INSERT succeeds, the explicit exception below fails the test.
  v_rejected := false;
  BEGIN
    INSERT INTO public.tax_transactions (taxpayer_role, currency, gross_amount, snapshot)
    VALUES ('seller', 'USD', -1, '{}'::jsonb);
    RAISE EXCEPTION 'tax_transactions accepted negative gross_amount';
  EXCEPTION WHEN check_violation THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'gross_amount non-negative invariant was not enforced'; END IF;

  v_rejected := false;
  BEGIN
    INSERT INTO public.tax_transactions (taxpayer_role, currency, taxable_amount, snapshot)
    VALUES ('seller', 'USD', -1, '{}'::jsonb);
    RAISE EXCEPTION 'tax_transactions accepted negative taxable_amount';
  EXCEPTION WHEN check_violation THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'taxable_amount non-negative invariant was not enforced'; END IF;

  v_rejected := false;
  BEGIN
    INSERT INTO public.tax_transactions (taxpayer_role, currency, tax_amount, snapshot)
    VALUES ('seller', 'USD', -1, '{}'::jsonb);
    RAISE EXCEPTION 'tax_transactions accepted negative tax_amount';
  EXCEPTION WHEN check_violation THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'tax_amount non-negative invariant was not enforced'; END IF;

  SELECT has_function_privilege('anon','public.initialize_order_tax_transaction(uuid)','EXECUTE') INTO v_anon;
  IF v_anon THEN RAISE EXCEPTION 'anon must not execute initialize_order_tax_transaction'; END IF;
  SELECT has_function_privilege('authenticated','public.initialize_order_tax_transaction(uuid)','EXECUTE') INTO v_auth;
  IF NOT v_auth THEN RAISE EXCEPTION 'authenticated must execute initialize_order_tax_transaction'; END IF;

  SELECT has_function_privilege('anon','public.finalize_order_settlement_allocations(uuid)','EXECUTE') INTO v_anon;
  IF v_anon THEN RAISE EXCEPTION 'anon must not execute finalize_order_settlement_allocations'; END IF;
  SELECT has_function_privilege('authenticated','public.finalize_order_settlement_allocations(uuid)','EXECUTE') INTO v_auth;
  IF v_auth THEN RAISE EXCEPTION 'authenticated must not execute finalize_order_settlement_allocations directly'; END IF;
END $$;

SELECT 'TEST 012 — TAX AMOUNT CONSTRAINTS AND RPC PRIVILEGES: PASS' AS test_result;
ROLLBACK;
