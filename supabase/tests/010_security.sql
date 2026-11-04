-- TEST 010 — SECURITY AND FINANCIAL RECORD INTEGRITY
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.products WHERE price < 0 OR price IS NULL OR stock < 0) THEN
    RAISE EXCEPTION 'Product financial or stock values are invalid';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE total_amount < 0 OR platform_commission < 0 OR seller_amount < 0
  ) THEN
    RAISE EXCEPTION 'Order financial values cannot be negative';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.order_items
    WHERE quantity <= 0 OR unit_price < 0 OR subtotal < 0
  ) THEN
    RAISE EXCEPTION 'Order item values are invalid';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.payment_orchestrations
    WHERE amount <= 0
       OR status NOT IN ('created', 'pending', 'requires_action', 'succeeded', 'failed', 'cancelled', 'expired')
  ) THEN
    RAISE EXCEPTION 'Payment orchestration values are invalid';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.webhook_events
    WHERE event_id IS NULL OR received_at IS NULL
       OR (processed_at IS NOT NULL AND payload_hash IS NULL)
  ) THEN
    RAISE EXCEPTION 'Webhook integrity fields are incomplete';
  END IF;
END $$;
SELECT 'TEST 010 — SECURITY: PASS' AS test_result;
ROLLBACK;
