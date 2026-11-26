BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_pending_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_actor uuid := (SELECT auth.uid());
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'ORDER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_order.buyer_id <> v_actor THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_order.status = 'cancelled' AND v_order.payment_status = 'cancelled' THEN
    RETURN jsonb_build_object('status', 'already_cancelled', 'order_id', v_order.id);
  END IF;

  IF v_order.status <> 'pending' OR v_order.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'ORDER_NOT_CANCELLABLE' USING ERRCODE = '55000';
  END IF;

  -- A Stripe checkout/session may still be paid asynchronously. Do not release
  -- the stock while any payment attempt is non-terminal.
  IF EXISTS (
    SELECT 1
      FROM public.payment_orchestrations p
     WHERE p.order_id = v_order.id
       AND p.status IN ('created', 'pending', 'requires_action')
  ) THEN
    RAISE EXCEPTION 'PAYMENT_ATTEMPT_ACTIVE' USING ERRCODE = '55000';
  END IF;

  UPDATE public.orders
     SET status = 'cancelled',
         payment_status = 'cancelled',
         cancelled_at = COALESCE(cancelled_at, now()),
         updated_at = now()
   WHERE id = v_order.id;

  PERFORM public.settle_order_inventory(v_order.id, 'failed');

  RETURN jsonb_build_object('status', 'cancelled', 'order_id', v_order.id);
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_pending_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_pending_order(uuid) TO authenticated;

COMMENT ON FUNCTION public.cancel_pending_order(uuid) IS
  'Buyer-owned cancellation for unpaid orders without an active payment attempt; releases the original atomic inventory reservation exactly once.';

COMMIT;
