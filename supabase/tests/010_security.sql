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

-- ============================================================
-- WALLET REFUND RPC CONTRACT
-- ============================================================

DO $
DECLARE
    v_private_oid oid := to_regprocedure('private.wallet_refund_order(uuid,numeric,text,text)');
    v_public_oid oid := to_regprocedure('public.wallet_refund_order(uuid,numeric,text,text)');
    v_private_definer boolean;
    v_public_definer boolean;
BEGIN
    IF v_private_oid IS NULL OR v_public_oid IS NULL THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: required private implementation or public wrapper is missing';
    END IF;

    SELECT prosecdef INTO v_private_definer FROM pg_proc WHERE oid = v_private_oid;
    SELECT prosecdef INTO v_public_definer FROM pg_proc WHERE oid = v_public_oid;

    IF v_private_definer IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: private accounting implementation must remain SECURITY DEFINER';
    END IF;

    IF v_public_definer IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: public wrapper must be SECURITY DEFINER';
    END IF;

    IF has_function_privilege('anon', v_private_oid, 'EXECUTE')
       OR has_function_privilege('anon', v_public_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: anon must not execute refund functions';
    END IF;

    IF has_function_privilege('authenticated', v_private_oid, 'EXECUTE')
       OR NOT has_function_privilege('authenticated', v_public_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: only the public wrapper may be executed by authenticated';
    END IF;

    IF has_schema_privilege('anon', 'private', 'USAGE') THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: anon must not have private schema usage';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE oid = v_public_oid
          AND coalesce(array_to_string(proconfig, ','), '') LIKE '%search_path=%'
    ) THEN
        RAISE EXCEPTION 'WALLET REFUND RPC CONTRACT: public wrapper search_path must be pinned';
    END IF;
END
$;

RAISE NOTICE 'TEST 010 — SECURITY: PASS';

ROLLBACK;