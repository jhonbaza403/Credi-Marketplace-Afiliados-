-- ============================================================
-- TEST 005 — AFFILIATES
-- ============================================================

BEGIN;

-- Los códigos de afiliado no deben estar vacíos.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM affiliates
        WHERE trim(ref_code) = ''
    ) THEN
        RAISE EXCEPTION
            'FALLO: afiliado con ref_code vacío';
    END IF;
END
$$;

-- No debe haber comisiones negativas.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM affiliate_commissions
        WHERE commission_amount < 0
    ) THEN
        RAISE EXCEPTION
            'FALLO: comisión negativa';
    END IF;
END
$$;

-- Protección contra auto-referidos.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM affiliate_attributions
        WHERE affiliate_user_id IS NOT NULL
          AND customer_user_id IS NOT NULL
          AND affiliate_user_id = customer_user_id
    ) THEN
        RAISE EXCEPTION
            'FALLO CRÍTICO: autorreferido detectado';
    END IF;
END
$$;

RAISE NOTICE 'TEST 005 — AFFILIATES: PASS';

ROLLBACK;