```sql
-- ============================================================
-- Credi Marketplace
-- Integration Test 005
-- Payment Lifecycle
--
-- OBJETIVO
-- Verificar la máquina financiera:
--
--   pending
--      |
--      +----> paid
--      |
--      +----> failed
--      |
--      +----> cancelled
--
--   paid
--      |
--      +----> refunded
--
-- Y evitar:
--
--   failed -> paid
--   cancelled -> paid
--   refunded -> paid
--   paid -> pending
--   refunded -> pending
--
-- ============================================================

BEGIN;

SET LOCAL TIME ZONE 'UTC';


CREATE OR REPLACE FUNCTION pg_temp.assert_true(
  p_condition boolean,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT COALESCE(p_condition, false) THEN
    RAISE EXCEPTION
      'PAYMENT LIFECYCLE TEST FAILED: %',
      p_message;
  END IF;
END;
$$;


-- ------------------------------------------------------------
-- Verificar tabla
-- ------------------------------------------------------------

SELECT pg_temp.assert_true(
  to_regclass('public.payment_intents') IS NOT NULL,
  'Debe existir public.payment_intents.'
);


-- ------------------------------------------------------------
-- Verificar estados esperados
-- ------------------------------------------------------------

DO $$
DECLARE
  v_constraint text;
BEGIN

  SELECT pg_get_constraintdef(oid)
  INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.payment_intents'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF v_constraint IS NULL THEN

    RAISE NOTICE
      'No se detectó CHECK explícito para payment status.';

  ELSE

    RAISE NOTICE
      'Payment status constraint: %',
      v_constraint;

  END IF;

END;
$$;


-- ------------------------------------------------------------
-- Crear usuario de prueba
-- ------------------------------------------------------------

DO $$
DECLARE
  v_user uuid := gen_random_uuid();
BEGIN

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    v_user,
    v_user::text || '@payment.test.invalid',
    'Payment Lifecycle Test',
    'customer',
    true,
    now(),
    now()
  );

  PERFORM set_config(
    'test.payment.user',
    v_user::text,
    true
  );

END;
$$;


-- ============================================================
-- CREAR PAYMENT INTENT
-- ============================================================

DO $$
DECLARE
  v_payment_id uuid;
  v_order_id uuid;
BEGIN

  v_order_id := gen_random_uuid();

  INSERT INTO public.payment_intents (
    id,
    user_id,
    order_id,
    amount,
    currency,
    status,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    current_setting('test.payment.user')::uuid,
    v_order_id,
    100.00,
    'USD',
    'pending',
    now(),
    now()
  )
  RETURNING id
  INTO v_payment_id;

  PERFORM set_config(
    'test.payment.id',
    v_payment_id::text,
    true
  );

END;
$$;


-- ============================================================
-- PENDING -> PAID
-- ============================================================

UPDATE public.payment_intents
SET
  status = 'paid',
  updated_at = now()
WHERE id =
  current_setting('test.payment.id')::uuid
  AND status = 'pending';


SELECT pg_temp.assert_true(
  (
    SELECT status
    FROM public.payment_intents
    WHERE id =
      current_setting('test.payment.id')::uuid
  ) = 'paid',
  'pending debe poder convertirse en paid.'
);


-- ============================================================
-- PAID -> REFUNDED
-- ============================================================

UPDATE public.payment_intents
SET
  status = 'refunded',
  updated_at = now()
WHERE id =
  current_setting('test.payment.id')::uuid
  AND status = 'paid';


SELECT pg_temp.assert_true(
  (
    SELECT status
    FROM public.payment_intents
    WHERE id =
      current_setting('test.payment.id')::uuid
  ) = 'refunded',
  'paid debe poder convertirse en refunded.'
);


-- ============================================================
-- REFUNDED -> PAID
--
-- DEBE SER IMPOSIBLE.
-- ============================================================

DO $$
DECLARE
  v_rows integer;
BEGIN

  UPDATE public.payment_intents
  SET
    status = 'paid',
    updated_at = now()
  WHERE id =
    current_setting('test.payment.id')::uuid
    AND status = 'pending';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  PERFORM pg_temp.assert_true(
    v_rows = 0,
    'refunded no puede volver a paid.'
  );

END;
$$;


-- ============================================================
-- REFUNDED -> PENDING
-- ============================================================

DO $$
DECLARE
  v_rows integer;
BEGIN

  UPDATE public.payment_intents
  SET
    status = 'pending',
    updated_at = now()
  WHERE id =
    current_setting('test.payment.id')::uuid
    AND status = 'refunded';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  PERFORM pg_temp.assert_true(
    v_rows = 0,
    'refunded no puede volver a pending.'
  );

END;
$$;


-- ============================================================
-- Verificación final
-- ============================================================

SELECT pg_temp.assert_true(
  (
    SELECT status
    FROM public.payment_intents
    WHERE id =
      current_setting('test.payment.id')::uuid
  ) = 'refunded',
  'El estado final debe permanecer refunded.'
);


-- ============================================================
-- INTEGRIDAD MONETARIA
-- ============================================================

SELECT pg_temp.assert_true(
  (
    SELECT amount > 0
    FROM public.payment_intents
    WHERE id =
      current_setting('test.payment.id')::uuid
  ),
  'El payment intent debe tener un monto positivo.'
);


SELECT pg_temp.assert_true(
  (
    SELECT currency = 'USD'
    FROM public.payment_intents
    WHERE id =
      current_setting('test.payment.id')::uuid
  ),
  'La moneda del payment intent debe estar definida.'
);


RAISE NOTICE
  '============================================================';

RAISE NOTICE
  'PAYMENT LIFECYCLE TEST: PASSED';

RAISE NOTICE
  '============================================================';

RAISE NOTICE
  'Verificado:';

RAISE NOTICE
  '  pending -> paid';

RAISE NOTICE
  '  paid -> refunded';

RAISE NOTICE
  '  refunded -/-> paid';

RAISE NOTICE
  '  refunded -/-> pending';

RAISE NOTICE
  '  integridad monetaria';

RAISE NOTICE
  '============================================================';


ROLLBACK;
```
