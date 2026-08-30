-- ============================================================
-- TEST 010 — SECURITY
-- ============================================================

BEGIN;

-- ============================================================
-- PRECIOS
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM products
        WHERE price < 0
           OR price IS NULL
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: producto con precio inválido';
    END IF;
END
$$;

-- ============================================================
-- STOCK
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM products
        WHERE stock < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: stock negativo';
    END IF;
END
$$;

-- ============================================================
-- ÓRDENES
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM orders
        WHERE total_amount < 0
           OR admin_commission < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: importe financiero negativo';
    END IF;
END
$$;

-- ============================================================
-- ORDER ITEMS
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM order_items
        WHERE quantity <= 0
           OR unit_price < 0
           OR subtotal < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: order_item inválido';
    END IF;
END
$$;

-- ============================================================
-- PAGOS
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM payments
        WHERE amount <= 0
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: pago con importe inválido';
    END IF;
END
$$;

-- ============================================================
-- WEBHOOKS
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM webhook_events
        WHERE event_id IS NULL
           OR received_at IS NULL
    ) THEN
        RAISE EXCEPTION
            'FALLO DE SEGURIDAD: webhook incompleto';
    END IF;
END
$$;

RAISE NOTICE 'TEST 010 — SECURITY: PASS';

ROLLBACK;