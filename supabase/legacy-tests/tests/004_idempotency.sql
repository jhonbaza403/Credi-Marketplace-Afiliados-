-- ============================================================
-- TEST 004 — IDEMPOTENCY
-- ============================================================

BEGIN;

-- La tabla debe existir.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'idempotency_keys'
    ) THEN
        RAISE EXCEPTION
            'FALLO: idempotency_keys no existe';
    END IF;
END
$$;

-- Deben existir restricciones UNIQUE.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t
          ON t.oid = c.conrelid
        JOIN pg_namespace n
          ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'idempotency_keys'
          AND c.contype = 'u'
    ) THEN
        RAISE EXCEPTION
            'FALLO: idempotency_keys no posee UNIQUE constraint';
    END IF;
END
$$;

-- No debe haber claves duplicadas.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM idempotency_keys
        GROUP BY key
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'FALLO CRÍTICO: Idempotency-Key duplicada';
    END IF;
END
$$;

RAISE NOTICE 'TEST 004 — IDEMPOTENCY: PASS';

ROLLBACK;