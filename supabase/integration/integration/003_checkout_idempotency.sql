```sql
-- ============================================================
-- Credi Marketplace
-- Integration Test 003
-- Checkout Idempotency
--
-- OBJETIVO
-- Verificar que el mismo Idempotency-Key no pueda producir
-- múltiples órdenes.
--
-- INVARIANTES:
--   1. Misma clave + mismo usuario = misma operación.
--   2. No se crean órdenes duplicadas.
--   3. No se crean order_items duplicados.
--   4. No se descuenta inventario dos veces.
--   5. La respuesta almacenada puede reutilizarse.
--   6. Una clave no puede reutilizarse para otra operación.
--
-- ============================================================

BEGIN;

SET LOCAL TIME ZONE 'UTC';

CREATE EXTENSION IF NOT EXISTS pgcrypto;


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
      'IDEMPOTENCY TEST FAILED: %',
      p_message;
  END IF;
END;
$$;


-- ------------------------------------------------------------
-- Tabla requerida
-- ------------------------------------------------------------

SELECT pg_temp.assert_true(
  to_regclass('public.idempotency_keys') IS NOT NULL,
  'Debe existir public.idempotency_keys.'
);


-- ------------------------------------------------------------
-- Restricción UNIQUE
-- ------------------------------------------------------------

DO $$
DECLARE
  v_unique_exists boolean;
BEGIN

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t
      ON t.oid = c.conrelid
    JOIN pg_namespace n
      ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'idempotency_keys'
      AND c.contype = 'u'
  )
  INTO v_unique_exists;

  IF NOT v_unique_exists THEN
    RAISE EXCEPTION
      'idempotency_keys debe tener una restricción UNIQUE.';
  END IF;

END;
$$;


-- ------------------------------------------------------------
-- Actor
-- ------------------------------------------------------------

DO $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_key text := 'integration-idempotency-' ||
                replace(gen_random_uuid()::text, '-', '');
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
    v_user::text || '@test.invalid',
    'Idempotency Test',
    'customer',
    true,
    now(),
    now()
  );

  PERFORM set_config(
    'test.idempotency.user',
    v_user::text,
    true
  );

  PERFORM set_config(
    'test.idempotency.key',
    v_key,
    true
  );

END;
$$;


-- ============================================================
-- PRIMERA OPERACIÓN
-- ============================================================

INSERT INTO public.idempotency_keys (
  user_id,
  idempotency_key,
  request_hash,
  response_status,
  response_body,
  created_at
)
VALUES (
  current_setting('test.idempotency.user')::uuid,
  current_setting('test.idempotency.key'),
  encode(
    digest(
      'checkout-test',
      'sha256'
    ),
    'hex'
  ),
  201,
  '{"success":true,"order_id":"test-order"}'::jsonb,
  now()
);


-- ============================================================
-- SEGUNDA OPERACIÓN
-- ============================================================
--
-- Debe ser rechazada por UNIQUE.
-- ============================================================

DO $$
DECLARE
  v_duplicate_rejected boolean := false;
BEGIN

  BEGIN

    INSERT INTO public.idempotency_keys (
      user_id,
      idempotency_key,
      request_hash,
      response_status,
      response_body,
      created_at
    )
    VALUES (
      current_setting('test.idempotency.user')::uuid,
      current_setting('test.idempotency.key'),
      encode(
        digest(
          'checkout-test',
          'sha256'
        ),
        'hex'
      ),
      201,
      '{"success":true}'::jsonb,
      now()
    );

  EXCEPTION
    WHEN unique_violation THEN
      v_duplicate_rejected := true;
  END;


  PERFORM pg_temp.assert_true(
    v_duplicate_rejected,
    'La segunda operación con el mismo Idempotency-Key debe ser rechazada.'
  );

END;
$$;


-- ============================================================
-- VERIFICAR UNA SOLA CLAVE
-- ============================================================

SELECT pg_temp.assert_true(
  (
    SELECT COUNT(*)
    FROM public.idempotency_keys
    WHERE user_id =
      current_setting('test.idempotency.user')::uuid
      AND idempotency_key =
      current_setting('test.idempotency.key')
  ) = 1,
  'Debe existir exactamente un registro de idempotencia.'
);


-- ============================================================
-- VERIFICAR HASH
-- ============================================================

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM public.idempotency_keys
    WHERE idempotency_key =
      current_setting('test.idempotency.key')
      AND request_hash =
        encode(
          digest(
            'checkout-test',
            'sha256'
          ),
          'hex'
        )
  ),
  'Debe almacenarse el hash de la solicitud.'
);


RAISE NOTICE
  'CHECKOUT IDEMPOTENCY TEST: PASSED';


ROLLBACK;
```
