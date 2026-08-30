
---

# `supabase/tests/001_schema.sql`

```sql
-- ============================================================
-- CREDI MARKETPLACE
-- TEST 001 — SCHEMA
-- ============================================================

BEGIN;

DO $$
DECLARE
    table_name_required TEXT;
BEGIN
    FOREACH table_name_required IN ARRAY ARRAY[
        'profiles',
        'stores',
        'categories',
        'products',
        'orders',
        'order_items',
        'inventory',
        'idempotency_keys',
        'affiliates',
        'payments',
        'webhook_events',
        'order_status_history',
        'notifications',
        'companies',
        'jobs',
        'professionals',
        'services'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = table_name_required
        ) THEN
            RAISE EXCEPTION
                'FALLO: tabla public.% inexistente',
                table_name_required;
        END IF;
    END LOOP;
END
$$;

-- Productos: integridad económica
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM products
        WHERE price < 0
           OR stock < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO: productos con precio o stock inválido';
    END IF;
END
$$;

-- Categorías sin nombres vacíos
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM categories
        WHERE trim(name) = ''
    ) THEN
        RAISE EXCEPTION
            'FALLO: categoría con nombre vacío';
    END IF;
END
$$;

-- Productos con slug duplicado
DO $$
BEGIN
    IF EXISTS (
        SELECT slug
        FROM products
        WHERE slug IS NOT NULL
        GROUP BY slug
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'FALLO: existen productos con slug duplicado';
    END IF;
END
$$;

RAISE NOTICE 'TEST 001 — SCHEMA: PASS';

ROLLBACK;