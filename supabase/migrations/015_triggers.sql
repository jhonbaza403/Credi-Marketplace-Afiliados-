-- ============================================================
-- 015_triggers.sql
-- Credi Marketplace
--
-- Triggers de integridad, timestamps, auditoría operacional
-- e historial de estados.
--
-- PostgreSQL / Supabase
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Función universal para updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Aplicar updated_at a tablas existentes
-- ============================================================

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles',
    'stores',
    'categories',
    'products',
    'orders',
    'order_items',
    'inventory',
    'affiliates',
    'affiliate_attributions',
    'affiliate_commissions',
    'payment_intents',
    'carts',
    'b2b_products',
    'b2b_orders'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = table_name
          AND column_name = 'updated_at'
      ) THEN

        EXECUTE format(
          'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I',
          table_name,
          table_name
        );

        EXECUTE format(
          'CREATE TRIGGER trg_%I_updated_at
           BEFORE UPDATE ON public.%I
           FOR EACH ROW
           EXECUTE FUNCTION public.set_updated_at()',
          table_name,
          table_name
        );

      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 3. Protección básica de cantidades
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_positive_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '22003',
        MESSAGE = 'La cantidad debe ser mayor que cero.';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.order_items') IS NOT NULL THEN

    DROP TRIGGER IF EXISTS trg_order_items_positive_quantity
    ON public.order_items;

    CREATE TRIGGER trg_order_items_positive_quantity
    BEFORE INSERT OR UPDATE
    ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_positive_quantity();

  END IF;
END;
$$;

-- ============================================================
-- 4. Protección de precios negativos
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_non_negative_money()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.price IS NOT NULL AND NEW.price < 0 THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '22003',
        MESSAGE = 'El precio no puede ser negativo.';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN

    DROP TRIGGER IF EXISTS trg_products_non_negative_price
    ON public.products;

    CREATE TRIGGER trg_products_non_negative_price
    BEFORE INSERT OR UPDATE
    ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_non_negative_money();

  END IF;
END;
$$;

-- ============================================================
-- 5. Historial de estados de órdenes
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN

    IF to_regclass('public.order_status_history') IS NOT NULL THEN

      INSERT INTO public.order_status_history (
        order_id,
        old_status,
        new_status,
        changed_at
      )
      VALUES (
        NEW.id,
        NULL,
        NEW.status,
        timezone('utc', now())
      );

    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.status IS DISTINCT FROM OLD.status THEN

    IF to_regclass('public.order_status_history') IS NOT NULL THEN

      INSERT INTO public.order_status_history (
        order_id,
        old_status,
        new_status,
        changed_at
      )
      VALUES (
        NEW.id,
        OLD.status,
        NEW.status,
        timezone('utc', now())
      );

    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL
     AND to_regclass('public.order_status_history') IS NOT NULL THEN

    DROP TRIGGER IF EXISTS trg_orders_status_history
    ON public.orders;

    CREATE TRIGGER trg_orders_status_history
    AFTER INSERT OR UPDATE OF status
    ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.record_order_status_change();

  END IF;
END;
$$;

-- ============================================================
-- 6. No permitir modificar precio histórico de order_items
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_order_item_financial_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN

    IF NEW.unit_price IS DISTINCT FROM OLD.unit_price
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal THEN

      RAISE EXCEPTION
        USING
          ERRCODE = '42501',
          MESSAGE =
            'El precio histórico y subtotal de una línea de pedido no pueden modificarse.';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.order_items') IS NOT NULL THEN

    DROP TRIGGER IF EXISTS trg_order_items_financial_protection
    ON public.order_items;

    CREATE TRIGGER trg_order_items_financial_protection
    BEFORE UPDATE
    ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_order_item_financial_data();

  END IF;
END;
$$;

COMMIT;