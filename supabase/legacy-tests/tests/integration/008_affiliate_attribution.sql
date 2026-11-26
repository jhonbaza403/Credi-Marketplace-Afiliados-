-- ============================================================
-- CREDI MARKETPLACE
-- Integration Test 008
-- AFFILIATE ATTRIBUTION
-- ============================================================

BEGIN;

DO $$
DECLARE
    v_affiliate_id uuid;
    v_product_id uuid;
    v_order_id uuid;
    v_user_id uuid;
    v_ref text;
    v_attribution_count integer;
    v_commission numeric;
BEGIN

    /*
     * --------------------------------------------------------
     * 1. Buscar afiliado activo
     * --------------------------------------------------------
     */

    SELECT
        id,
        referral_code
    INTO
        v_affiliate_id,
        v_ref
    FROM affiliates
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1;

    IF v_affiliate_id IS NULL THEN
        RAISE NOTICE
            'TEST SKIPPED: no existe afiliado activo.';
        RETURN;
    END IF;

    /*
     * --------------------------------------------------------
     * 2. Buscar usuario
     * --------------------------------------------------------
     */

    SELECT id
    INTO v_user_id
    FROM profiles
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE
            'TEST SKIPPED: no existe usuario.';
        RETURN;
    END IF;

    /*
     * --------------------------------------------------------
     * 3. Buscar producto
     * --------------------------------------------------------
     */

    SELECT id
    INTO v_product_id
    FROM products
    WHERE is_active = true
      AND stock > 0
    LIMIT 1;

    IF v_product_id IS NULL THEN
        RAISE NOTICE
            'TEST SKIPPED: no existe producto disponible.';
        RETURN;
    END IF;

    /*
     * --------------------------------------------------------
     * 4. Buscar orden atribuida
     * --------------------------------------------------------
     */

    SELECT id
    INTO v_order_id
    FROM orders
    WHERE buyer_id = v_user_id
      AND affiliate_ref = v_ref
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_order_id IS NULL THEN
        RAISE NOTICE
            'TEST SKIPPED: no existe orden atribuida al afiliado.';
        RETURN;
    END IF;

    /*
     * --------------------------------------------------------
     * 5. Verificar atribución
     * --------------------------------------------------------
     */

    SELECT count(*)
    INTO v_attribution_count
    FROM affiliate_attributions
    WHERE order_id = v_order_id
      AND affiliate_id = v_affiliate_id;

    IF v_attribution_count <> 1 THEN
        RAISE EXCEPTION
            'FAIL: la orden no tiene una atribución afiliada válida.';
    END IF;

    /*
     * --------------------------------------------------------
     * 6. Verificar comisión
     * --------------------------------------------------------
     */

    SELECT commission_amount
    INTO v_commission
    FROM affiliate_attributions
    WHERE order_id = v_order_id
      AND affiliate_id = v_affiliate_id
    LIMIT 1;

    IF v_commission IS NULL OR v_commission < 0 THEN
        RAISE EXCEPTION
            'FAIL: comisión afiliada inválida.';
    END IF;

    /*
     * --------------------------------------------------------
     * 7. Protección contra autorreferido
     * --------------------------------------------------------
     */

    IF EXISTS (
        SELECT 1
        FROM affiliates a
        WHERE a.id = v_affiliate_id
          AND a.user_id = v_user_id
    ) THEN

        IF EXISTS (
            SELECT 1
            FROM affiliate_attributions aa
            WHERE aa.order_id = v_order_id
              AND aa.affiliate_id = v_affiliate_id
              AND aa.commission_amount > 0
        ) THEN
            RAISE EXCEPTION
                'FAIL: se detectó comisión por autorreferido.';
        END IF;

    END IF;

    RAISE NOTICE
        'PASS: atribución y comisión de afiliado verificadas.';

END $$;

ROLLBACK;