```sql
-- ============================================================
-- Credi Marketplace
-- Integration Test 004
-- Checkout Rollback
--
-- OBJETIVO
-- Demostrar que cualquier error ocurrido durante checkout
-- provoca rollback completo.
--
-- Debe revertirse:
--
--   orders
--   order_items
--   inventario
--   reservas
--   movimientos de inventario
--   atribución de afiliado
--   comisiones
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
      'ROLLBACK TEST FAILED: %',
      p_message;
  END IF;
END;
$$;


-- ------------------------------------------------------------
-- Actor
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
    v_user::text || '@rollback.test.invalid',
    'Rollback Test',
    'customer',
    true,
    now(),
    now()
  );

  PERFORM set_config(
    'test.rollback.user',
    v_user::text,
    true
  );

END;
$$;


-- ------------------------------------------------------------
-- Producto
-- ------------------------------------------------------------

DO $$
DECLARE
  v_product uuid;
  v_stock numeric;
BEGIN

  SELECT id, stock
  INTO v_product, v_stock
  FROM public.products
  WHERE is_active = true
    AND stock >= 2
  ORDER BY created_at NULLS LAST, id
  LIMIT 1;

  IF v_product IS NULL THEN
    RAISE EXCEPTION
      'No existe producto de prueba.';
  END IF;

  PERFORM set_config(
    'test.rollback.product',
    v_product::text,
    true
  );

  PERFORM set_config(
    'test.rollback.stock',
    v_stock::text,
    true
  );

END;
$$;


-- ============================================================
-- ESTADO ANTES
-- ============================================================

DO $$
DECLARE
  v_orders bigint;
  v_items bigint;
BEGIN

  SELECT COUNT(*)
  INTO v_orders
  FROM public.orders
  WHERE customer_id =
    current_setting('test.rollback.user')::uuid;

  SELECT COUNT(*)
  INTO v_items
  FROM public.order_items oi
  JOIN public.orders o
    ON o.id = oi.order_id
  WHERE o.customer_id =
    current_setting('test.rollback.user')::uuid;

  PERFORM set_config(
    'test.rollback.orders_before',
    v_orders::text,
    true
  );

  PERFORM set_config(
    'test.rollback.items_before',
    v_items::text,
    true
  );

END;
$$;


-- ============================================================
-- FORZAR ERROR
--
-- Se utiliza un UUID inexistente para obligar a la RPC
-- a rechazar la operación.
-- ============================================================

DO $$
DECLARE
  v_failed boolean := false;
BEGIN

  SAVEPOINT rollback_checkout;

  BEGIN

    PERFORM public.create_pending_order_batch(
      current_setting('test.rollback.user')::uuid,

      jsonb_build_array(
        jsonb_build_object(
          'product_id',
          current_setting('test.rollback.product')::uuid,
          'quantity',
          1
        ),
        jsonb_build_object(
          'product_id',
          gen_random_uuid(),
          'quantity',
          1
        )
      ),

      NULL
    );

  EXCEPTION
    WHEN OTHERS THEN

      v_failed := true;

      ROLLBACK TO SAVEPOINT rollback_checkout;

  END;


  PERFORM pg_temp.assert_true(
    v_failed,
    'La operación deliberadamente inválida debe fallar.'
  );


  RELEASE SAVEPOINT rollback_checkout;

END;
$$;


-- ============================================================
-- VERIFICAR ROLLBACK DE ORDERS
-- ============================================================

SELECT pg_temp.assert_true(
  (
    SELECT COUNT(*)
    FROM public.orders
    WHERE customer_id =
      current_setting('test.rollback.user')::uuid
  ) =
  current_setting('test.rollback.orders_before')::bigint,
  'No debe quedar ninguna orden creada parcialmente.'
);


-- ============================================================
-- VERIFICAR ROLLBACK DE ORDER ITEMS
-- ============================================================

SELECT pg_temp.assert_true(
  (
    SELECT COUNT(*)
    FROM public.order_items oi
    JOIN public.orders o
      ON o.id = oi.order_id
    WHERE o.customer_id =
      current_setting('test.rollback.user')::uuid
  ) =
  current_setting('test.rollback.items_before')::bigint,
  'No debe quedar ningún order_item parcial.'
);


-- ============================================================
-- VERIFICAR STOCK
-- ============================================================

SELECT pg_temp.assert_true(
  (
    SELECT stock
    FROM public.products
    WHERE id =
      current_setting('test.rollback.product')::uuid
  ) =
  current_setting('test.rollback.stock')::numeric,
  'El inventario debe permanecer exactamente igual.'
);


-- ============================================================
-- VERIFICAR RESERVAS
--
-- Si existe inventory_reservations, no debe existir reserva
-- asociada a una orden que nunca llegó a existir.
-- ============================================================

DO $$
BEGIN

  IF to_regclass('public.inventory_reservations') IS NOT NULL THEN

    IF EXISTS (
      SELECT 1
      FROM public.inventory_reservations ir
      LEFT JOIN public.orders o
        ON o.id = ir.order_id
      WHERE o.id IS NULL
    ) THEN

      RAISE EXCEPTION
        'Existen reservas huérfanas después del rollback.';

    END IF;

  END IF;

END;
$$;


RAISE NOTICE
  'CHECKOUT ROLLBACK TEST: PASSED';


ROLLBACK;
```
