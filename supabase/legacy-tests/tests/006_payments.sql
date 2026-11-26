-- ============================================================
-- TEST 006 — PAYMENTS
-- ============================================================

BEGIN;

-- Estados financieros válidos.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM payments
        WHERE status NOT IN (
            'pending',
            'paid',
            'failed',
            'cancelled',
            'refunded'
        )
    THEN
        RAISE EXCEPTION
            'FALLO: payment con estado inválido';
    END IF;
END
$$;

-- Importes positivos.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM payments
        WHERE amount <= 0
    ) THEN
        RAISE EXCEPTION
            'FALLO: payment con amount inválido';
    END IF;
END
$$;

-- Payment intent único.
DO $$
BEGIN
    IF EXISTS (
        SELECT payment_intent_id
        FROM payments
        WHERE payment_intent_id IS NOT NULL
        GROUP BY payment_intent_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'FALLO CRÍTICO: payment_intent duplicado';
    END IF;
END
$$;

RAISE NOTICE 'TEST 006 — PAYMENTS: PASS';

ROLLBACK;