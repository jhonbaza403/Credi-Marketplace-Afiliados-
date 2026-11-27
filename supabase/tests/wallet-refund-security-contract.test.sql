BEGIN;
SELECT plan(6);

SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid='public.wallet_refund_order(uuid,numeric,text,text)'::regprocedure),
  'public wallet refund RPC runs as its trusted owner'
);

SELECT ok(
  (SELECT coalesce(proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='public.wallet_refund_order(uuid,numeric,text,text)'::regprocedure),
  'public wallet refund RPC pins an empty search_path'
);

SELECT ok(
  NOT has_function_privilege('anon','public.wallet_refund_order(uuid,numeric,text,text)','EXECUTE')
  AND has_function_privilege('authenticated','public.wallet_refund_order(uuid,numeric,text,text)','EXECUTE')
  AND has_function_privilege('service_role','public.wallet_refund_order(uuid,numeric,text,text)','EXECUTE'),
  'public wallet refund RPC is available only to authenticated and service_role'
);

SELECT ok(
  NOT has_function_privilege('anon','private.wallet_refund_order(uuid,numeric,text,text)','EXECUTE')
  AND NOT has_function_privilege('authenticated','private.wallet_refund_order(uuid,numeric,text,text)','EXECUTE')
  AND has_function_privilege('service_role','private.wallet_refund_order(uuid,numeric,text,text)','EXECUTE'),
  'private wallet refund implementation is not directly callable by client roles'
);

SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid='private.wallet_refund_order(uuid,numeric,text,text)'::regprocedure)
  AND (SELECT coalesce(proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='private.wallet_refund_order(uuid,numeric,text,text)'::regprocedure),
  'private refund implementation remains SECURITY DEFINER with pinned search_path'
);


-- Create a transaction-scoped authenticated user without platform-owner rights.
-- The public wrapper is callable by authenticated users, but its private implementation
-- must reject callers that are not provisioned as platform_owner.
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES (
  'f2c5b9d8-7a61-4b20-9a8e-6d4c2f1a0b33',
  'authenticated', 'authenticated', 'pg-wallet-refund-non-owner@credi.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role, is_active, platform_owner)
VALUES (
  'f2c5b9d8-7a61-4b20-9a8e-6d4c2f1a0b33',
  'pg-wallet-refund-non-owner@credi.test', 'pgTAP non-owner', 'customer', true, false
)
ON CONFLICT (id) DO UPDATE
SET is_active = true, platform_owner = false;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'f2c5b9d8-7a61-4b20-9a8e-6d4c2f1a0b33', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT throws_ok(
  $ SELECT public.wallet_refund_order(
    '00000000-0000-0000-0000-000000000001'::uuid,
    1.00::numeric,
    'pgTAP unauthorized refund attempt',
    'pg-wallet-refund-denied-0001'
  ) $,
  'P0001',
  'FORBIDDEN',
  'authenticated non-platform-owner is rejected before any refund or ledger mutation'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
