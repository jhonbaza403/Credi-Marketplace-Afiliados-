-- ============================================================
-- TEST 008 — ORDER STATE MACHINE
-- ============================================================

BEGIN;

-- Estados permitidos.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM orders
        WHERE status NOT IN (
            'pending',
            'paid',
            'failed',
            'cancelled',
            'refunded',
            'expired'
        )
    ) THEN
        RAISE EXCEPTION
            'FALLO: estado de orden inválido';
    END IF;
END
$$;

-- Historial debe conservar estado.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM order_status_history
        WHERE status IS NULL
    ) THEN
        RAISE EXCEPTION
            'FALLO: historial sin estado';
    END IF;
END
$$;

-- Todo cambio debe poseer timestamp.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM order_status_history
        WHERE created_at IS NULL
    ) THEN
        RAISE EXCEPTION
            'FALLO: historial sin created_at';
    END IF;
END
$$;

RAISE NOTICE 'TEST 008 — ORDER STATE MACHINE: PASS';

ROLLBACK;