-- ============================================================
-- TEST 007 — WEBHOOKS
-- ============================================================

BEGIN;

-- Eventos duplicados no deben existir.
DO $$
BEGIN
    IF EXISTS (
        SELECT event_id
        FROM webhook_events
        WHERE event_id IS NOT NULL
        GROUP BY event_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'FALLO CRÍTICO: webhook duplicado';
    END IF;
END
$$;

-- Eventos deben tener timestamp.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM webhook_events
        WHERE received_at IS NULL
    ) THEN
        RAISE EXCEPTION
            'FALLO: webhook sin received_at';
    END IF;
END
$$;

-- Hash requerido para eventos procesables.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM webhook_events
        WHERE processed = TRUE
          AND event_hash IS NULL
    ) THEN
        RAISE EXCEPTION
            'FALLO: webhook procesado sin event_hash';
    END IF;
END
$$;

RAISE NOTICE 'TEST 007 — WEBHOOKS: PASS';

ROLLBACK;