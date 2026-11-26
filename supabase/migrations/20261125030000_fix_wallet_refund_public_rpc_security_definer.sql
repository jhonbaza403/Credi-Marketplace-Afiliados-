BEGIN;

-- Production previously had an invoker wrapper calling a private function
-- that authenticated users cannot execute directly. Keep the accounting
-- engine private and expose the same constrained SECURITY DEFINER RPC in both
-- environments. The empty search_path prevents object shadowing.
CREATE OR REPLACE FUNCTION public.wallet_refund_order(
  p_order_id uuid,
  p_amount numeric,
  p_reason text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private.wallet_refund_order(
    p_order_id,
    p_amount,
    p_reason,
    p_idempotency_key
  );
$function$;

REVOKE ALL ON FUNCTION private.wallet_refund_order(uuid,numeric,text,text)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.wallet_refund_order(uuid,numeric,text,text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.wallet_refund_order(uuid,numeric,text,text)
  TO authenticated;

COMMIT;
