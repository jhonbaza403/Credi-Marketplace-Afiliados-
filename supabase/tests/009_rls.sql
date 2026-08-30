-- ============================================================
-- TEST 009 — ROW LEVEL SECURITY
-- ============================================================

BEGIN;

DO $$
DECLARE
    table_name_required TEXT;
BEGIN
    FOREACH table_name_required IN ARRAY ARRAY[
        'profiles',
        'stores',
        'products',
        'orders',
        'order_items',
        'payments'
    ]
    LOOP

        IF NOT EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n
              ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname = table_name_required
              AND c.relrowsecurity = TRUE
        ) THEN

            RAISE EXCEPTION
                'FALLO CRÍTICO: RLS deshabilitado en public.%',
                table_name_required;

        END IF;

    END LOOP;
END
$$;

RAISE NOTICE 'TEST 009 — RLS: PASS';

ROLLBACK;