-- Credi 360° database security regression checks.
-- Executed in the Supabase database test harness.

BEGIN;

DO $$
DECLARE
  v_rls boolean;
  v_anon boolean;
  v_auth boolean;
BEGIN
  select c.relrowsecurity into v_rls
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='affiliate_products';
  if coalesce(v_rls,false) is not true then raise exception 'affiliate_products must have RLS enabled'; end if;

  select has_function_privilege('anon','public.create_b2b_award(uuid,uuid,uuid,uuid)','EXECUTE') into v_anon;
  if v_anon then raise exception 'anon must not execute create_b2b_award'; end if;

  select has_function_privilege('anon','public.settle_order_inventory(uuid,text)','EXECUTE') into v_anon;
  if v_anon then raise exception 'anon must not execute settle_order_inventory'; end if;

  select has_function_privilege('anon','public.consume_api_rate_limit(text,integer,integer)','EXECUTE') into v_anon;
  if v_anon then raise exception 'anon must not execute consume_api_rate_limit'; end if;

  select has_function_privilege('authenticated','public.consume_api_rate_limit(text,integer,integer)','EXECUTE') into v_auth;
  if v_auth then raise exception 'authenticated must not execute consume_api_rate_limit directly'; end if;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname='public'
      AND tablename='affiliate_products'
      AND indexname='affiliate_products_affiliate_product_uq'
  ) THEN
    RAISE EXCEPTION 'duplicate affiliate_products unique index remains';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname='public'
      AND tablename='b2b_awards'
      AND indexname='idx_b2b_awards_quote'
  ) THEN
    RAISE EXCEPTION 'duplicate b2b_awards quote index remains';
  END IF;
END $$;

RAISE NOTICE 'TEST 011 — CREDI 360 SECURITY: PASS';
ROLLBACK;
