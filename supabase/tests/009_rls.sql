-- Credi Marketplace RLS behavioral regression tests.
-- Uses synthetic rows inside a transaction and always rolls them back.

BEGIN;

DO $$
DECLARE
  v_expected text[] := ARRAY[
    'profiles', 'stores', 'products', 'orders', 'order_items',
    'payment_methods', 'payment_orchestrations'
  ];
  v_found integer;
  v_enabled integer;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE c.relrowsecurity)
    INTO v_found, v_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY (v_expected)
    AND c.relkind IN ('r', 'p');

  IF v_found <> cardinality(v_expected) THEN
    RAISE EXCEPTION 'RLS test schema incomplete: expected %, found %', cardinality(v_expected), v_found;
  END IF;
  IF v_enabled <> cardinality(v_expected) THEN
    RAISE EXCEPTION 'RLS must be enabled on all % tested tables; enabled %', cardinality(v_expected), v_enabled;
  END IF;
END $$;

-- Fixed synthetic identities; all changes are rolled back at the end.
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'rls-user-a@example.test', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"RLS Test User A"}'::jsonb, now(), now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'rls-user-b@example.test', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"RLS Test User B"}'::jsonb, now(), now()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'rls-user-a@example.test', 'RLS Test User A'),
  ('20000000-0000-4000-8000-000000000002', 'rls-user-b@example.test', 'RLS Test User B')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

INSERT INTO public.stores (id, vendor_id, store_name, slug, is_verified, is_active)
VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'RLS Private Store A', 'rls-private-store-a', false, true),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'RLS Public Store B', 'rls-public-store-b', true, true);

INSERT INTO public.products (id, store_id, title, slug, price, stock, is_active)
VALUES
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'RLS Private Product A', 'rls-private-product-a', 10, 3, false),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'RLS Private Product B', 'rls-private-product-b', 12, 2, false),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'RLS Public Product B', 'rls-public-product-b', 14, 4, true);

INSERT INTO public.orders (id, buyer_id, total_amount)
VALUES
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 10),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 12);

INSERT INTO public.order_items (order_id, product_id, store_id, product_title, quantity, unit_price, subtotal)
VALUES
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'RLS Private Product A', 1, 10, 10),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'RLS Private Product B', 1, 12, 12);

INSERT INTO public.payment_methods (id, user_id, method_type, label)
VALUES
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'wallet', 'RLS fixture A'),
  ('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'wallet', 'RLS fixture B');

INSERT INTO public.payment_orchestrations (id, user_id, amount, method_type, idempotency_key)
VALUES
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 10, 'wallet', 'rls-orchestration-a'),
  ('70000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 12, 'wallet', 'rls-orchestration-b');

-- Anonymous users can see active public catalog rows, but not private rows or profiles.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.products WHERE id = '40000000-0000-4000-8000-000000000003';
  IF v_count <> 1 THEN RAISE EXCEPTION 'anon must read the active public product'; END IF;

  SELECT count(*) INTO v_count FROM public.products WHERE id IN (
    '40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002'
  );
  IF v_count <> 0 THEN RAISE EXCEPTION 'anon must not read inactive private products'; END IF;

  SELECT count(*) INTO v_count FROM public.stores WHERE id = '30000000-0000-4000-8000-000000000001';
  IF v_count <> 0 THEN RAISE EXCEPTION 'anon must not read the unverified private store'; END IF;

  v_count := 0;
  BEGIN
    SELECT count(*) INTO v_count FROM public.profiles;
  EXCEPTION WHEN insufficient_privilege THEN
    v_count := 0;
  END;
  IF v_count <> 0 THEN RAISE EXCEPTION 'anon must not read profile rows'; END IF;

  BEGIN
    INSERT INTO public.payment_methods (user_id, method_type, label)
    VALUES ('10000000-0000-4000-8000-000000000001', 'wallet', 'anon must not insert');
    RAISE EXCEPTION 'anon unexpectedly inserted a payment method';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
RESET ROLE;

-- User A: self profile and owned rows are visible; private rows of B are not.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
DO $$
DECLARE
  v_count integer;
  v_rows integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000001';
  IF v_count <> 1 THEN RAISE EXCEPTION 'user A must read their own profile'; END IF;
  SELECT count(*) INTO v_count FROM public.profiles WHERE id = '20000000-0000-4000-8000-000000000002';
  IF v_count <> 0 THEN RAISE EXCEPTION 'user A must not read user B profile'; END IF;

  SELECT count(*) INTO v_count FROM public.stores WHERE id = '30000000-0000-4000-8000-000000000001';
  IF v_count <> 1 THEN RAISE EXCEPTION 'user A must read their own store'; END IF;
  SELECT count(*) INTO v_count FROM public.products WHERE id = '40000000-0000-4000-8000-000000000001';
  IF v_count <> 1 THEN RAISE EXCEPTION 'user A must read their own inactive product'; END IF;
  SELECT count(*) INTO v_count FROM public.products WHERE id = '40000000-0000-4000-8000-000000000002';
  IF v_count <> 0 THEN RAISE EXCEPTION 'user A must not read user B private product'; END IF;

  SELECT count(*) INTO v_count FROM public.orders WHERE id = '50000000-0000-4000-8000-000000000001';
  IF v_count <> 1 THEN RAISE EXCEPTION 'user A must read their own order'; END IF;
  SELECT count(*) INTO v_count FROM public.orders WHERE id = '50000000-0000-4000-8000-000000000002';
  IF v_count <> 0 THEN RAISE EXCEPTION 'user A must not read user B order'; END IF;
  SELECT count(*) INTO v_count FROM public.order_items WHERE order_id = '50000000-0000-4000-8000-000000000001';
  IF v_count <> 1 THEN RAISE EXCEPTION 'user A must read their own order items'; END IF;
  SELECT count(*) INTO v_count FROM public.order_items WHERE order_id = '50000000-0000-4000-8000-000000000002';
  IF v_count <> 0 THEN RAISE EXCEPTION 'user A must not read user B order items'; END IF;

  SELECT count(*) INTO v_count FROM public.payment_methods WHERE id = '60000000-0000-4000-8000-000000000001';
  IF v_count <> 1 THEN RAISE EXCEPTION 'user A must read their own payment method'; END IF;
  SELECT count(*) INTO v_count FROM public.payment_methods WHERE id = '60000000-0000-4000-8000-000000000002';
  IF v_count <> 0 THEN RAISE EXCEPTION 'user A must not read user B payment method'; END IF;
  SELECT count(*) INTO v_count FROM public.payment_orchestrations WHERE id = '70000000-0000-4000-8000-000000000001';
  IF v_count <> 1 THEN RAISE EXCEPTION 'user A must read their own payment orchestration'; END IF;
  SELECT count(*) INTO v_count FROM public.payment_orchestrations WHERE id = '70000000-0000-4000-8000-000000000002';
  IF v_count <> 0 THEN RAISE EXCEPTION 'user A must not read user B payment orchestration'; END IF;

  UPDATE public.profiles SET full_name = 'RLS User A Updated'
  WHERE id = '10000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'user A must update their own allowed profile field'; END IF;

  IF has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'platform_owner', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'is_active', 'UPDATE') THEN
    RAISE EXCEPTION 'authenticated must not update privileged profile columns';
  END IF;

  BEGIN
    UPDATE public.profiles SET role = 'vendor'
    WHERE id = '10000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'user A unexpectedly changed profile role';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.profiles SET platform_owner = true
    WHERE id = '10000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'user A unexpectedly changed platform_owner';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.profiles SET is_active = false
    WHERE id = '10000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'user A unexpectedly changed is_active';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.stores SET description = 'updated by owner'
  WHERE id = '30000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'user A must update their own store'; END IF;

  UPDATE public.stores SET description = 'unauthorized'
  WHERE id = '30000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'user A must not update user B store'; END IF;

  UPDATE public.products SET price = price + 1
  WHERE id = '40000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'user A must update their own product'; END IF;

  UPDATE public.products SET price = price + 1
  WHERE id = '40000000-0000-4000-8000-000000000003';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'user A must not update user B public product'; END IF;

  BEGIN
    INSERT INTO public.payment_orchestrations (user_id, amount, method_type, idempotency_key)
    VALUES ('20000000-0000-4000-8000-000000000002', 5, 'wallet', 'rls-orchestration-forbidden-a');
    RAISE EXCEPTION 'user A unexpectedly inserted a payment for user B';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.orders (buyer_id) VALUES ('10000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'user A unexpectedly inserted an order directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- User B must receive a distinct, owner-only view of the same fixtures.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$
DECLARE v_count integer; v_rows integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.profiles WHERE id = '20000000-0000-4000-8000-000000000002';
  IF v_count <> 1 THEN RAISE EXCEPTION 'user B must read their own profile'; END IF;
  SELECT count(*) INTO v_count FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000001';
  IF v_count <> 0 THEN RAISE EXCEPTION 'user B must not read user A profile'; END IF;

  SELECT count(*) INTO v_count FROM public.products WHERE id = '40000000-0000-4000-8000-000000000002';
  IF v_count <> 1 THEN RAISE EXCEPTION 'user B must read their own private product'; END IF;
  SELECT count(*) INTO v_count FROM public.products WHERE id = '40000000-0000-4000-8000-000000000001';
  IF v_count <> 0 THEN RAISE EXCEPTION 'user B must not read user A private product'; END IF;

  SELECT count(*) INTO v_count FROM public.orders WHERE id = '50000000-0000-4000-8000-000000000002';
  IF v_count <> 1 THEN RAISE EXCEPTION 'user B must read their own order'; END IF;
  SELECT count(*) INTO v_count FROM public.orders WHERE id = '50000000-0000-4000-8000-000000000001';
  IF v_count <> 0 THEN RAISE EXCEPTION 'user B must not read user A order'; END IF;

  SELECT count(*) INTO v_count FROM public.payment_methods WHERE id = '60000000-0000-4000-8000-000000000002';
  IF v_count <> 1 THEN RAISE EXCEPTION 'user B must read their own payment method'; END IF;
  SELECT count(*) INTO v_count FROM public.payment_methods WHERE id = '60000000-0000-4000-8000-000000000001';
  IF v_count <> 0 THEN RAISE EXCEPTION 'user B must not read user A payment method'; END IF;

  UPDATE public.products SET price = price + 1
  WHERE id = '40000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'user B must not update user A product'; END IF;

  BEGIN
    INSERT INTO public.payment_methods (user_id, method_type, label)
    VALUES ('10000000-0000-4000-8000-000000000001', 'wallet', 'forbidden foreign owner');
    RAISE EXCEPTION 'user B unexpectedly inserted a payment method for user A';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- service_role is the privileged service boundary and must bypass client RLS.
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
DO $$
DECLARE v_count integer;
BEGIN
  IF NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'service_role must retain its RLS bypass capability';
  END IF;
  SELECT count(*) INTO v_count FROM public.profiles WHERE id IN (
    '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002'
  );
  IF v_count <> 2 THEN RAISE EXCEPTION 'service_role must read both profiles'; END IF;
  SELECT count(*) INTO v_count FROM public.orders WHERE id IN (
    '50000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002'
  );
  IF v_count <> 2 THEN RAISE EXCEPTION 'service_role must read both orders'; END IF;
  SELECT count(*) INTO v_count FROM public.payment_orchestrations WHERE id IN (
    '70000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002'
  );
  IF v_count <> 2 THEN RAISE EXCEPTION 'service_role must read both payment orchestrations'; END IF;
END $$;
RESET ROLE;

SELECT 'TEST 009 — RLS role-based read/write boundaries: PASS' AS test_result;
ROLLBACK;
