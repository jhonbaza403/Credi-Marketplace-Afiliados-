BEGIN;
SELECT plan(9);
SELECT ok(to_regprocedure('private.wallet_refund_order(uuid,numeric,text,text)') IS NOT NULL,'private refund engine exists');
SELECT ok(to_regprocedure('public.wallet_refund_order(uuid,numeric,text,text)') IS NOT NULL,'public refund RPC wrapper exists');
SELECT ok((SELECT p.prosecdef FROM pg_proc AS p WHERE p.oid=to_regprocedure('private.wallet_refund_order(uuid,numeric,text,text)')),'private refund engine executes with controlled definer privileges');
SELECT ok((SELECT p.prosecdef FROM pg_proc AS p WHERE p.oid=to_regprocedure('public.wallet_refund_order(uuid,numeric,text,text)')),'public RPC wrapper is SECURITY DEFINER');
SELECT ok(has_function_privilege('authenticated','public.wallet_refund_order(uuid,numeric,text,text)','EXECUTE'),'authenticated role can invoke the public refund RPC');
SELECT ok(NOT has_function_privilege('anon','public.wallet_refund_order(uuid,numeric,text,text)','EXECUTE'),'anonymous role cannot invoke the public refund RPC');
SELECT ok(
  NOT has_function_privilege('authenticated','private.wallet_refund_order(uuid,numeric,text,text)','EXECUTE')
  AND NOT has_function_privilege('anon','private.wallet_refund_order(uuid,numeric,text,text)','EXECUTE'),
  'API roles cannot execute the private refund implementation directly'
);
SELECT ok(
  (SELECT coalesce(p.proconfig,ARRAY[]::text[]) @> ARRAY['search_path=""'] FROM pg_proc AS p WHERE p.oid=to_regprocedure('public.wallet_refund_order(uuid,numeric,text,text)')),
  'public RPC wrapper pins an empty search_path'
);
SELECT ok(
  (SELECT position('private.wallet_refund_order' IN pg_get_functiondef(p.oid))>0 FROM pg_proc AS p WHERE p.oid=to_regprocedure('public.wallet_refund_order(uuid,numeric,text,text)')),
  'public RPC delegates to private refund implementation'
);
SELECT * FROM finish();
ROLLBACK;
