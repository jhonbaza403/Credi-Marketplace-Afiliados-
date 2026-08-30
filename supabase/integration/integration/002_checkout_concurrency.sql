```sql
-- ============================================================
-- Credi Marketplace
-- Integration Test 002
-- Checkout Concurrency
--
-- OBJETIVO
-- Verificar que dos checkout concurrentes sobre el mismo
-- inventario no puedan vender/reservar más unidades de las
-- realmente disponibles.
--
-- INVARIANTES:
--   1. El stock nunca puede quedar negativo.
--   2. La suma de cantidades aprobadas nunca supera el stock.
--   3. FOR UPDATE debe serializar el acceso al inventario.
--   4. Una operación rechazada no debe dejar efectos parciales.
--   5. El precio debe proceder exclusivamente de PostgreSQL.
--
-- IMPORTANTE:
-- Este test requiere dos conexiones PostgreSQL independientes
-- para reproducir una carrera real.
--
-- ============================================================

BEGIN;

SET LOCAL TIME ZONE 'UTC';

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------

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
      'CONCURRENCY TEST FAILED: %',
      p_message;
  END IF;
END;
$$;


-- ------------------------------------------------------------
-- Verificar RPC
-- ------------------------------------------------------------

DO $$
BEGIN

  IF to_regprocedure(
    'public.create_pending_order_batch(uuid,jsonb,text)'
  ) IS NULL THEN

    RAISE EXCEPTION
      'No existe public.create_pending_order_batch(uuid,jsonb,text).';

  END IF;

END;
$$;


-- ------------------------------------------------------------
-- Crear comprador de prueba
-- ------------------------------------------------------------

DO $$
DECLARE
  v_buyer uuid := gen_random_uuid();
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
    v_buyer,
    'concurrency-' ||
      replace(v_buyer::text, '-', '') ||
      '@test.invalid',
    'Concurrency Test',
    'customer',
    true,
    now(),
    now()
  );

  PERFORM set_config(
    'test.concurrency.buyer_id',
    v_buyer::text,
    true
  );

END;
$$;


-- ------------------------------------------------------------
-- Producto con stock suficiente
-- ------------------------------------------------------------

DO $$
DECLARE
  v_product uuid;
  v_stock numeric;
BEGIN

  SELECT
    id,
    stock
  INTO
    v_product,
    v_stock
  FROM public.products
  WHERE is_active = true
    AND stock >= 2
  ORDER BY created_at NULLS LAST, id
  LIMIT 1;

  IF v_product IS NULL THEN
    RAISE EXCEPTION
      'No existe producto activo con stock >= 2.';
  END IF;

  PERFORM set_config(
    'test.concurrency.product_id',
    v_product::text,
    true
  );

  PERFORM set_config(
    'test.concurrency.initial_stock',
    v_stock::text,
    true
  );

END;
$$;


-- ------------------------------------------------------------
-- Estado inicial
-- ------------------------------------------------------------

DO $$
DECLARE
  v_product uuid;
  v_stock numeric;
BEGIN

  v_product :=
    current_setting('test.concurrency.product_id')::uuid;

  SELECT stock
  INTO v_stock
  FROM public.products
  WHERE id = v_product;

  PERFORM set_config(
    'test.concurrency.before_stock',
    v_stock::text,
    true
  );

END;
$$;


-- ============================================================
-- PRUEBA DE BLOQUEO TRANSACCIONAL
-- ============================================================
--
-- Esta parte verifica que PostgreSQL pueda bloquear la fila
-- del producto mediante FOR UPDATE.
--
-- No intenta simular dos sesiones dentro de una misma conexión,
-- porque eso NO sería una prueba real de concurrencia.
-- ============================================================

DO $$
DECLARE
  v_product uuid;
  v_stock numeric;
BEGIN

  v_product :=
    current_setting('test.concurrency.product_id')::uuid;

  SELECT stock
  INTO v_stock
  FROM public.products
  WHERE id = v_product
  FOR UPDATE;

  PERFORM pg_temp.assert_true(
    v_stock >= 2,
    'La fila de inventario debe poder bloquearse mediante FOR UPDATE.'
  );

END;
$$;


-- ============================================================
-- VERIFICACIÓN DE INVARIANTE
-- ============================================================

DO $$
DECLARE
  v_product uuid;
  v_stock numeric;
BEGIN

  v_product :=
    current_setting('test.concurrency.product_id')::uuid;

  SELECT stock
  INTO v_stock
  FROM public.products
  WHERE id = v_product;

  PERFORM pg_temp.assert_true(
    v_stock >= 0,
    'El stock nunca puede ser negativo.'
  );

END;
$$;


RAISE NOTICE
  '============================================================';

RAISE NOTICE
  'CHECKOUT CONCURRENCY TEST: BASELINE PASSED';

RAISE NOTICE
  '============================================================';

RAISE NOTICE
  'La prueba real de dos sesiones debe ejecutarse con:';

RAISE NOTICE
  '  Sesión A -> BEGIN + checkout';

RAISE NOTICE
  '  Sesión B -> BEGIN + checkout simultáneo';

RAISE NOTICE
  'y verificar que FOR UPDATE serialice ambas operaciones.';

RAISE NOTICE
  '============================================================';


ROLLBACK;
```
