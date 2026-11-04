-- TEST 006 — PAYMENT ORCHESTRATIONS
BEGIN;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.payment_orchestrations
    WHERE status NOT IN ('created', 'pending', 'requires_action', 'succeeded', 'failed', 'cancelled', 'expired')
  ) THEN
    RAISE EXCEPTION 'Payment orchestration has an invalid status';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payment_orchestrations WHERE amount <= 0) THEN
    RAISE EXCEPTION 'Payment orchestration amount must be positive';
  END IF;
  IF EXISTS (
    SELECT idempotency_key
    FROM public.payment_orchestrations
    GROUP BY idempotency_key HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Payment orchestration idempotency key is duplicated';
  END IF;
END $$;
SELECT 'TEST 006 — PAYMENT ORCHESTRATIONS: PASS' AS test_result;
ROLLBACK;
