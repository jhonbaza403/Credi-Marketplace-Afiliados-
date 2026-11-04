-- ============================================================
-- TEST 003
-- INVENTORY / CONCURRENCY
-- ============================================================

BEGIN;

-- Nunca debe existir stock negativo.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.inventory
        WHERE available_quantity < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO CRÍTICO: inventory.quantity < 0';
    END IF;
END
$$;

-- Reservas nunca negativas.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM inventory
        WHERE reserved_quantity < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO CRÍTICO: reserved_quantity < 0';
    END IF;
END
$$;

-- Nunca reservar más unidades que las disponibles.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM inventory
        WHERE reserved_quantity > available_quantity
    ) THEN
        RAISE EXCEPTION
            'FALLO CRÍTICO: inventario reservado superior al stock';
    END IF;
END
$$;

-- Verificación de movimientos inválidos.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM inventory_movements
        WHERE quantity = 0
    ) THEN
        RAISE EXCEPTION
            'FALLO: movimiento de inventario con cantidad cero';
    END IF;
END
$$;

SELECT 'TEST 003 — INVENTORY CONCURRENCY: PASS' AS test_result;

ROLLBACK;