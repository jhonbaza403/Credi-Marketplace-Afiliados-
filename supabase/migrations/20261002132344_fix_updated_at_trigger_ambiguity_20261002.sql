-- Repair migration corresponding to the already-applied Supabase migration.
-- Version: 20261002132344
-- Purpose: keep Git migration history synchronized and preserve the corrected
-- updated_at trigger implementation without re-running non-idempotent history.

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

DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
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
    IF to_regclass('public.' || v_table_name) IS NOT NULL THEN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns AS c
        WHERE c.table_schema = 'public'
          AND c.table_name = v_table_name
          AND c.column_name = 'updated_at'
      ) THEN
        EXECUTE format(
          'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I',
          v_table_name,
          v_table_name
        );

        EXECUTE format(
          'CREATE TRIGGER trg_%I_updated_at
           BEFORE UPDATE ON public.%I
           FOR EACH ROW
           EXECUTE FUNCTION public.set_updated_at()',
          v_table_name,
          v_table_name
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;
