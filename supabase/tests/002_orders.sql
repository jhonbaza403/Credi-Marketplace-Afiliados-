-- ============================================================
-- TEST 002 — ORDERS
-- ============================================================

BEGIN;

-- No debe existir una orden con total negativo.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM orders
        WHERE total_amount < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO: existe una orden con total negativo';
    END IF;
END
$$;

-- Las cantidades de order_items deben ser positivas.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM order_items
        WHERE quantity <= 0
    ) THEN
        RAISE EXCEPTION
            'FALLO: order_item con cantidad inválida';
    END IF;
END
$$;

-- Los precios históricos nunca deben ser negativos.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM order_items
        WHERE unit_price < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO: order_item con precio negativo';
    END IF;
END
$$;

-- Los subtotales no pueden ser negativos.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM order_items
        WHERE subtotal < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO: subtotal negativo';
    END IF;
END
$$;

-- Todas las órdenes deben poseer estado.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM orders
        WHERE status IS NULL
    ) THEN
        RAISE EXCEPTION
            'FALLO: orden sin estado';
    END IF;
END
$$;

RAISE NOTICE 'TEST 002 — ORDERS: PASS';

ROLLBACK;