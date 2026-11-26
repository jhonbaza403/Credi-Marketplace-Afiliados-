BEGIN;
SELECT plan(8);

SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid='public.create_pending_order_batch(uuid,jsonb,text,text)'::regprocedure),
  'legacy checkout RPC executes in trusted definer context'
);
SELECT ok(
  (SELECT coalesce(proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='public.create_pending_order_batch(uuid,jsonb,text,text)'::regprocedure),
  'legacy checkout RPC pins an empty search_path'
);
SELECT ok(
  NOT has_function_privilege('anon','public.create_pending_order_batch(uuid,jsonb,text,text)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.create_pending_order_batch(uuid,jsonb,text,text)','EXECUTE')
  AND has_function_privilege('service_role','public.create_pending_order_batch(uuid,jsonb,text,text)','EXECUTE'),
  'legacy checkout RPC is server-only'
);
SELECT ok(
  pg_get_functiondef('public.create_pending_order_batch(uuid,jsonb,text,text)'::regprocedure) LIKE '%invalid_product_price%'
  AND pg_get_functiondef('public.create_pending_order_batch(uuid,jsonb,text,text)'::regprocedure) LIKE '%inventory_reservations%'
  AND pg_get_functiondef('public.create_pending_order_batch(uuid,jsonb,text,text)'::regprocedure) LIKE '%idempotency_keys%',
  'legacy checkout retains price validation, inventory reservations and idempotency'
);
SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid='public.create_pending_order_batch(uuid,jsonb,text,text,text)'::regprocedure),
  'canonical five-argument checkout RPC executes in trusted definer context'
);
SELECT ok(
  (SELECT coalesce(proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='public.create_pending_order_batch(uuid,jsonb,text,text,text)'::regprocedure),
  'canonical checkout RPC pins an empty search_path'
);
SELECT ok(
  NOT has_function_privilege('anon','public.create_pending_order_batch(uuid,jsonb,text,text,text)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.create_pending_order_batch(uuid,jsonb,text,text,text)','EXECUTE')
  AND has_function_privilege('service_role','public.create_pending_order_batch(uuid,jsonb,text,text,text)','EXECUTE'),
  'canonical checkout RPC is server-only'
);
SELECT ok(
  pg_get_functiondef('public.create_pending_order_batch(uuid,jsonb,text,text,text)'::regprocedure) LIKE '%inventory_reservations%'
  AND pg_get_functiondef('public.create_pending_order_batch(uuid,jsonb,text,text,text)'::regprocedure) LIKE '%idempotency_keys%',
  'canonical checkout RPC preserves reservation and idempotency contracts'
);

SELECT * FROM finish();
ROLLBACK;
