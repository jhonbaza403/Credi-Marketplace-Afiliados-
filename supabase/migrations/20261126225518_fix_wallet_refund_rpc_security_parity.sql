BEGIN;

-- The private implementation performs identity, platform-owner, rate-limit,
-- amount-ceiling, journal-balance and idempotency checks. The public RPC must
-- run as its postgres owner so authenticated callers can invoke that private
-- helper; the helper still reads auth.uid() from the caller's JWT.
CREATE OR REPLACE FUNCTION public.wallet_refund_order(
  p_order_id uuid,
  p_amount numeric,
  p_reason text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private.wallet_refund_order($1, $2, $3, $4);
$function$;

-- Match the trusted backend ACL across environments; the helper remains
-- inaccessible to PUBLIC, anon and authenticated and is not in exposed schemas.
GRANT EXECUTE ON FUNCTION private.wallet_refund_order(uuid,numeric,text,text) TO service_role;

REVOKE ALL ON FUNCTION public.wallet_refund_order(uuid,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_refund_order(uuid,numeric,text,text) TO authenticated, service_role;

DO $contract$
DECLARE
  wrapper record;
BEGIN
  SELECT p.prosecdef, p.proconfig, p.proacl
    INTO wrapper
  FROM pg_proc p
  WHERE p.oid = 'public.wallet_refund_order(uuid,numeric,text,text)'::regprocedure;

  IF NOT wrapper.prosecdef OR NOT (coalesce(wrapper.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'WALLET_REFUND_RPC_SECURITY_CONTRACT_FAILED';
  END IF;

  IF has_function_privilege('anon','public.wallet_refund_order(uuid,numeric,text,text)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.wallet_refund_order(uuid,numeric,text,text)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.wallet_refund_order(uuid,numeric,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'WALLET_REFUND_RPC_ACL_CONTRACT_FAILED';
  END IF;

  IF has_function_privilege('anon','private.wallet_refund_order(uuid,numeric,text,text)','EXECUTE')
     OR has_function_privilege('authenticated','private.wallet_refund_order(uuid,numeric,text,text)','EXECUTE')
     OR NOT has_function_privilege('service_role','private.wallet_refund_order(uuid,numeric,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'WALLET_REFUND_PRIVATE_ACL_CONTRACT_FAILED';
  END IF;
END;
$contract$;

COMMIT;