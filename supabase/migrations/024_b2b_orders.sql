-- ============================================================
-- CREDI MARKETPLACE
-- MIGRATION: HARDEN B2B ORDERS
--
-- Compatible con el INITIAL DATABASE SCHEMA
-- Supabase / PostgreSQL
-- Next.js 16.3
-- React 19
-- Node.js 24
--
-- NO CREA UNA SEGUNDA TABLA B2B.
-- REFINA LA TABLA EXISTENTE.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ASEGURAR EXTENSIÓN
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 2. ASEGURAR ENUMS
-- ============================================================

DO $$
BEGIN
  CREATE TYPE public.b2b_order_status AS ENUM (
    'pending',
    'verifying',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;


DO $$
BEGIN
  CREATE TYPE public.b2b_payment_method AS ENUM (
    'binance_pay',
    'usdt_trc20',
    'bank_transfer'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;


-- ============================================================
-- 3. ASEGURAR TABLA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.b2b_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID
    NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,

  product_id UUID
    NOT NULL
    REFERENCES public.b2b_products(id)
    ON DELETE RESTRICT,

  supplier_id UUID
    NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,

  product_title TEXT NOT NULL,

  quantity INTEGER NOT NULL
    CHECK (quantity > 0),

  unit_price_usdt NUMERIC(12,2) NOT NULL
    CHECK (unit_price_usdt > 0),

  total_usdt NUMERIC(14,2) NOT NULL
    CHECK (total_usdt > 0),

  payment_method public.b2b_payment_method NOT NULL,

  payment_reference TEXT,

  status public.b2b_order_status NOT NULL
    DEFAULT 'pending',

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT now()
);


-- ============================================================
-- 4. INTEGRIDAD DEL TOTAL
-- ============================================================

ALTER TABLE public.b2b_orders
DROP CONSTRAINT IF EXISTS b2b_orders_total_check;

ALTER TABLE public.b2b_orders
DROP CONSTRAINT IF EXISTS b2b_orders_total_integrity;

ALTER TABLE public.b2b_orders
ADD CONSTRAINT b2b_orders_total_integrity
CHECK (
  total_usdt =
  ROUND(
    quantity::NUMERIC * unit_price_usdt,
    2
  )
);


-- ============================================================
-- 5. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS
  b2b_orders_user_id_idx
ON public.b2b_orders(user_id);

CREATE INDEX IF NOT EXISTS
  b2b_orders_supplier_id_idx
ON public.b2b_orders(supplier_id);

CREATE INDEX IF NOT EXISTS
  b2b_orders_product_id_idx
ON public.b2b_orders(product_id);

CREATE INDEX IF NOT EXISTS
  b2b_orders_status_idx
ON public.b2b_orders(status);

CREATE INDEX IF NOT EXISTS
  b2b_orders_created_at_idx
ON public.b2b_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS
  b2b_orders_user_created_idx
ON public.b2b_orders(
  user_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  b2b_orders_supplier_created_idx
ON public.b2b_orders(
  supplier_id,
  created_at DESC
);


-- ============================================================
-- 6. FUNCIÓN UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- 7. TRIGGER UPDATED_AT
-- ============================================================

DROP TRIGGER IF EXISTS
  set_b2b_orders_updated_at
ON public.b2b_orders;

CREATE TRIGGER
  set_b2b_orders_updated_at
BEFORE UPDATE
ON public.b2b_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 8. RLS
-- ============================================================

ALTER TABLE public.b2b_orders
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 9. ELIMINAR POLÍTICAS ANTERIORES
-- ============================================================

DROP POLICY IF EXISTS
  b2b_orders_select
ON public.b2b_orders;

DROP POLICY IF EXISTS
  b2b_orders_insert
ON public.b2b_orders;

DROP POLICY IF EXISTS
  b2b_orders_update
ON public.b2b_orders;

DROP POLICY IF EXISTS
  b2b_orders_user_update
ON public.b2b_orders;

DROP POLICY IF EXISTS
  b2b_orders_supplier_update
ON public.b2b_orders;

DROP POLICY IF EXISTS
  b2b_orders_admin_all
ON public.b2b_orders;

DROP POLICY IF EXISTS
  b2b_orders_delete
ON public.b2b_orders;


-- ============================================================
-- 10. LECTURA
-- ============================================================

CREATE POLICY b2b_orders_select
ON public.b2b_orders
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR
  supplier_id = (SELECT auth.uid())
  OR
  (SELECT public.is_admin())
);


-- ============================================================
-- 11. CREACIÓN
-- ============================================================

CREATE POLICY b2b_orders_insert
ON public.b2b_orders
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND status = 'pending'::public.b2b_order_status
);


-- ============================================================
-- 12. ACTUALIZACIÓN DEL COMPRADOR
-- ============================================================
--
-- El comprador solamente puede actuar mientras la orden
-- se encuentra en estado operativo inicial.
--
-- La protección de columnas financieras debe reforzarse
-- posteriormente mediante RPC/Server Action.
-- ============================================================

CREATE POLICY b2b_orders_user_update
ON public.b2b_orders
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND status IN (
    'pending'::public.b2b_order_status,
    'verifying'::public.b2b_order_status
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);


-- ============================================================
-- 13. ACTUALIZACIÓN DEL PROVEEDOR
-- ============================================================

CREATE POLICY b2b_orders_supplier_update
ON public.b2b_orders
FOR UPDATE
TO authenticated
USING (
  supplier_id = (SELECT auth.uid())
)
WITH CHECK (
  supplier_id = (SELECT auth.uid())
);


-- ============================================================
-- 14. ADMINISTRADOR
-- ============================================================

CREATE POLICY b2b_orders_admin_all
ON public.b2b_orders
FOR ALL
TO authenticated
USING (
  (SELECT public.is_admin())
)
WITH CHECK (
  (SELECT public.is_admin())
);


-- ============================================================
-- 15. ELIMINACIÓN
-- ============================================================
--
-- No se permite eliminar órdenes desde el cliente.
--
-- Las órdenes constituyen información comercial y
-- potencialmente financiera/auditable.
-- ============================================================

-- No se crea política DELETE.


-- ============================================================
-- 16. PERMISOS
-- ============================================================

REVOKE ALL
ON public.b2b_orders
FROM anon;

GRANT
  SELECT,
  INSERT,
  UPDATE
ON public.b2b_orders
TO authenticated;


-- ============================================================
-- 17. COMENTARIOS
-- ============================================================

COMMENT ON TABLE public.b2b_orders IS
'Órdenes mayoristas B2B de Credi Marketplace.';

COMMENT ON COLUMN public.b2b_orders.user_id IS
'Usuario comprador propietario de la orden.';

COMMENT ON COLUMN public.b2b_orders.product_id IS
'Producto mayorista asociado a la orden.';

COMMENT ON COLUMN public.b2b_orders.supplier_id IS
'Proveedor responsable del producto mayorista.';

COMMENT ON COLUMN public.b2b_orders.unit_price_usdt IS
'Precio unitario expresado en USDT.';

COMMENT ON COLUMN public.b2b_orders.total_usdt IS
'Importe total de la orden en USDT.';

COMMENT ON COLUMN public.b2b_orders.payment_reference IS
'Referencia externa de la operación de pago.';

COMMENT ON COLUMN public.b2b_orders.status IS
'Estado operacional de la orden B2B.';


-- ============================================================
-- 18. COMMIT
-- ============================================================

COMMIT;
