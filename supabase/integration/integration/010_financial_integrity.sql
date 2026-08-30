-- ============================================================
-- CREDI MARKETPLACE
-- Integration Test 010
-- FINANCIAL INTEGRITY
--
-- Verifica:
--   subtotal
--   total
--   comisión plataforma
--   comisión afiliado
--   importe vendedor
--   consistencia entre order_items y orders
-- ============================================================

BEGIN;

DO $$
DECLARE
    v_order_id uuid;
    v_items_total numeric;
    v_order_total numeric;
    v_platform_commission numeric;
    v_affiliate_commission numeric;
    v_seller_amount numeric;
    v_expected_seller numeric;
    v_difference numeric;
BEGIN

    /*
     * --------------------------------------------------------
     * 1. Seleccionar orden
     * --------------------------------------------------------
     */

    SELECT
        id,
        total_amount,
        platform_commission,
        affiliate_commission,
        seller_amount
    INTO
        v_order_id,
        v_order_total,
        v_platform_commission,
        v_affiliate_commission,
        v_seller_amount
    FROM orders
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_order_id IS NULL THEN
        RAISE NOTICE
            'TEST SKIPPED: no existe ninguna orden.';
        RETURN;
    END IF;

    /*
     * --------------------------------------------------------
     * 2. Calcular total desde order_items
     * --------------------------------------------------------
     */

    SELECT
        COALESCE(
            SUM(
                ROUND(
                    unit_price * quantity,
                    2
                )
            ),
            0
        )
    INTO v_items_total
    FROM order_items
    WHERE order_id = v_order_id;

    /*
     * --------------------------------------------------------
     * 3. Comparar order_items contra orders
     * --------------------------------------------------------
     */

    v_difference :=
        ABS(
            COALESCE(v_items_total, 0)
            -
            COALESCE(v_order_total, 0)
        );

    IF v_difference > 0.01 THEN
        RAISE EXCEPTION
            'FAIL: total de orden inconsistente. Items=%, Order=%',
            v_items_total,
            v_order_total;
    END IF;

    /*
     * --------------------------------------------------------
     * 4. Validar comisión plataforma
     * --------------------------------------------------------
     */

    IF COALESCE(v_platform_commission, 0) < 0 THEN
        RAISE EXCEPTION
            'FAIL: comisión de plataforma negativa.';
    END IF;

    IF COALESCE(v_platform_commission, 0)
       > COALESCE(v_order_total, 0) THEN

        RAISE EXCEPTION
            'FAIL: comisión de plataforma superior al total.';
    END IF;

    /*
     * --------------------------------------------------------
     * 5. Validar comisión afiliado
     * --------------------------------------------------------
     */

    IF COALESCE(v_affiliate_commission, 0) < 0 THEN
        RAISE EXCEPTION
            'FAIL: comisión de afiliado negativa.';
    END IF;

    IF COALESCE(v_affiliate_commission, 0)
       > COALESCE(v_order_total, 0) THEN

        RAISE EXCEPTION
            'FAIL: comisión afiliada superior al total.';
    END IF;

    /*
     * --------------------------------------------------------
     * 6. Calcular importe esperado para vendedor
     *
     * total
     * - comisión plataforma
     * - comisión afiliado
     * --------------------------------------------------------
     */

    v_expected_seller :=
        ROUND(
            COALESCE(v_order_total, 0)
            -
            COALESCE(v_platform_commission, 0)
            -
            COALESCE(v_affiliate_commission, 0),
            2
        );

    /*
     * --------------------------------------------------------
     * 7. Comparar seller_amount
     * --------------------------------------------------------
     */

    v_difference :=
        ABS(
            COALESCE(v_seller_amount, 0)
            -
            v_expected_seller
        );

    IF v_difference > 0.01 THEN
        RAISE EXCEPTION
            'FAIL: importe del vendedor inconsistente. Esperado=%, Actual=%',
            v_expected_seller,
            v_seller_amount;
    END IF;

    /*
     * --------------------------------------------------------
     * 8. Validar que ninguna cifra financiera sea NaN/Infinity
     * --------------------------------------------------------
     */

    IF NOT isfinite(
        COALESCE(v_order_total, 0)::numeric
    ) THEN
        RAISE EXCEPTION
            'FAIL: total financiero no finito.';
    END IF;

    IF NOT isfinite(
        COALESCE(v_platform_commission, 0)::numeric
    ) THEN
        RAISE EXCEPTION
            'FAIL: comisión de plataforma no finita.';
    END IF;

    IF NOT isfinite(
        COALESCE(v_affiliate_commission, 0)::numeric
    ) THEN
        RAISE EXCEPTION
            'FAIL: comisión afiliada no finita.';
    END IF;

    IF NOT isfinite(
        COALESCE(v_seller_amount, 0)::numeric
    ) THEN
        RAISE EXCEPTION
            'FAIL: importe del vendedor no finito.';
    END IF;

    /*
     * --------------------------------------------------------
     * 9. Resultado
     * --------------------------------------------------------
     */

    RAISE NOTICE
        'PASS: integridad financiera verificada.';

    RAISE NOTICE
        'Order: %',
        v_order_id;

    RAISE NOTICE
        'Items total: %',
        v_items_total;

    RAISE NOTICE
        'Order total: %',
        v_order_total;

    RAISE NOTICE
        'Platform commission: %',
        v_platform_commission;

    RAISE NOTICE
        'Affiliate commission: %',
        v_affiliate_commission;

    RAISE NOTICE
        'Seller amount: %',
        v_seller_amount;

END $$;

ROLLBACK;