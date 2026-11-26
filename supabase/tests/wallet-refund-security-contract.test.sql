BEGIN;
SELECT plan(5);

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

SELECT * FROM finish();
ROLLBACK;
