-- ============================================================
-- 012_create_pending_order_batch.sql
-- CHECKOUT MULTIPRODUCTO TRANSACCIONAL
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_pending_order_batch(
    p_buyer_id uuid,
    p_items jsonb,
    p_affiliate_ref text DEFAULT NULL,
    p_idempotency_key text DEFAULT NULL
)
RETURNS TABLE (
    order_id uuid,
    total_amount numeric(20,2),
    commission_amount numeric(20,2),
    currency char(3),
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id uuid;

    v_item jsonb;

    v_product_id uuid;
    v_quantity integer;

    v_title text;
    v_unit_price numeric(20,2);
    v_stock integer;
    v_store_id uuid;

    v_subtotal numeric(20,2);

    v_total numeric(20,2) := 0;

    v_affiliate_id uuid;
    v_affiliate_user_id uuid;
    v_commission_rate numeric(7,4);

    v_commission_amount numeric(20,2) := 0;

    v_existing_idempotency idempotency_keys%ROWTYPE;

    v_request_hash text;
BEGIN

    -- ========================================================
    -- 1. Validaciones básicas
    -- ========================================================

    IF p_buyer_id IS NULL THEN
        RAISE EXCEPTION 'buyer_required'
            USING ERRCODE = '22023';
    END IF;

    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0
    THEN
        RAISE EXCEPTION 'items_required'
            USING ERRCODE = '22023';
    END IF;

    IF jsonb_array_length(p_items) > 100 THEN
        RAISE EXCEPTION 'too_many_items'
            USING ERRCODE = '22023';
    END IF;

    -- ========================================================
    -- 2. Idempotencia
    -- ========================================================

    IF p_idempotency_key IS NOT NULL THEN

        SELECT *
        INTO v_existing_idempotency
        FROM public.idempotency_keys
        WHERE user_id = p_buyer_id
          AND endpoint = '/api/checkout'
          AND idempotency_key = p_idempotency_key
        FOR UPDATE;

        IF FOUND THEN

            IF v_existing_idempotency.expires_at < now() THEN

                DELETE FROM public.idempotency_keys
                WHERE id = v_existing_idempotency.id;

            ELSE

                IF v_existing_idempotency.resource_id IS NOT NULL THEN

                    SELECT
                        o.id,
                        o.total_amount,
                        COALESCE(o.admin_commission, 0),
                        COALESCE(o.currency, 'USD'),
                        o.status
                    INTO
                        order_id,
                        total_amount,
                        commission_amount,
                        currency,
                        status
                    FROM public.orders o
                    WHERE o.id =
                        v_existing_idempotency.resource_id;

                    IF FOUND THEN
                        RETURN NEXT;
                        RETURN;
                    END IF;

                END IF;

                RAISE EXCEPTION 'idempotency_in_progress'
                    USING ERRCODE = '23505';
            END IF;
        END IF;

        v_request_hash :=
            encode(
                extensions.digest(
                    p_items::text,
                    'sha256'
                ),
                'hex'
            );

        INSERT INTO public.idempotency_keys (
            user_id,
            idempotency_key,
            request_hash,
            endpoint,
            locked_at,
            expires_at
        )
        VALUES (
            p_buyer_id,
            p_idempotency_key,
            v_request_hash,
            '/api/checkout',
            now(),
            now() + interval '24 hours'
        );
    END IF;

    -- ========================================================
    -- 3. Validar afiliado
    -- ========================================================

    IF p_affiliate_ref IS NOT NULL
       AND btrim(p_affiliate_ref) <> ''
    THEN

        SELECT
            r.affiliate_id,
            r.affiliate_user_id,
            r.commission_rate
        INTO
            v_affiliate_id,
            v_affiliate_user_id,
            v_commission_rate
        FROM public.resolve_affiliate(
            p_affiliate_ref,
            p_buyer_id
        ) r
        LIMIT 1;

        IF v_affiliate_id IS NULL THEN
            RAISE EXCEPTION 'invalid_affiliate'
                USING ERRCODE = '23514';
        END IF;

    END IF;

    -- ========================================================
    -- 4. Crear orden
    -- ========================================================

    INSERT INTO public.orders (
        customer_id,
        status,
        currency,
        total_amount,
        admin_commission
    )
    VALUES (
        p_buyer_id,
        'pending',
        'USD',
        0,
        0
    )
    RETURNING id
    INTO v_order_id;

    -- ========================================================
    -- 5. Procesar productos
    -- ========================================================

    FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(p_items)
    LOOP

        BEGIN
            v_product_id :=
                (v_item ->> 'product_id')::uuid;

            v_quantity :=
                (v_item ->> 'quantity')::integer;

        EXCEPTION WHEN invalid_text_representation THEN

            RAISE EXCEPTION 'invalid_product_item'
                USING ERRCODE = '22023';

        END;

        IF v_quantity IS NULL
           OR v_quantity < 1
           OR v_quantity > 100
        THEN
            RAISE EXCEPTION 'invalid_quantity'
                USING ERRCODE = '22023';
        END IF;

        -- ====================================================
        -- BLOQUEO DE INVENTARIO
        -- ====================================================

        SELECT
            p.title,
            p.price,
            p.stock,
            p.store_id
        INTO
            v_title,
            v_unit_price,
            v_stock,
            v_store_id
        FROM public.products p
        WHERE p.id = v_product_id
          AND p.is_active = true
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'product_not_available'
                USING ERRCODE = 'P0002';
        END IF;

        IF v_stock < v_quantity THEN
            RAISE EXCEPTION 'insufficient_stock'
                USING ERRCODE = '23514';
        END IF;

        IF v_unit_price IS NULL
           OR v_unit_price < 0
        THEN
            RAISE EXCEPTION 'invalid_product_price'
                USING ERRCODE = '22023';
        END IF;

        -- ====================================================
        -- SUBTOTAL CALCULADO EXCLUSIVAMENTE EN DB
        -- ====================================================

        v_subtotal :=
            public.money_round(
                v_unit_price * v_quantity
            );

        v_total :=
            public.money_round(
                v_total + v_subtotal
            );

        -- ====================================================
        -- ORDER ITEM
        -- ====================================================

        INSERT INTO public.order_items (
            order_id,
            product_id,
            quantity,
            unit_price,
            subtotal
        )
        VALUES (
            v_order_id,
            v_product_id,
            v_quantity,
            v_unit_price,
            v_subtotal
        );

        -- ====================================================
        -- RESERVA / DESCUENTO DE INVENTARIO
        -- ====================================================

        UPDATE public.products
        SET
            stock = stock - v_quantity,
            updated_at = now()
        WHERE id = v_product_id
          AND stock >= v_quantity;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'inventory_race_condition'
                USING ERRCODE = '40001';
        END IF;

    END LOOP;

    -- ========================================================
    -- 6. Comisión
    -- ========================================================

    IF v_affiliate_id IS NOT NULL THEN

        v_commission_amount :=
            public.calculate_commission(
                v_total,
                v_commission_rate
            );

        INSERT INTO public.affiliate_attributions (
            affiliate_id,
            order_id,
            buyer_id,
            referral_code,
            commission_rate,
            commission_base,
            commission_amount,
            status
        )
        VALUES (
            v_affiliate_id,
            v_order_id,
            p_buyer_id,
            p_affiliate_ref,
            v_commission_rate,
            v_total,
            v_commission_amount,
            'pending'
        );

    END IF;

    -- ========================================================
    -- 7. Actualizar orden
    -- ========================================================

    UPDATE public.orders
    SET
        total_amount = v_total,
        admin_commission = v_commission_amount,
        updated_at = now()
    WHERE id = v_order_id;

    -- ========================================================
    -- 8. Historial inicial
    -- ========================================================

    INSERT INTO public.order_status_history (
        order_id,
        from_status,
        to_status,
        changed_by,
        reason
    )
    VALUES (
        v_order_id,
        NULL,
        'pending',
        p_buyer_id,
        'Order created'
    );

    -- ========================================================
    -- 9. Completar idempotencia
    -- ========================================================

    IF p_idempotency_key IS NOT NULL THEN

        UPDATE public.idempotency_keys
        SET
            status_code = 201,
            response_body = jsonb_build_object(
                'success', true,
                'order_id', v_order_id,
                'status', 'pending',
                'total_amount', v_total
            ),
            resource_type = 'order',
            resource_id = v_order_id,
            completed_at = now(),
            updated_at = now()
        WHERE user_id = p_buyer_id
          AND endpoint = '/api/checkout'
          AND idempotency_key = p_idempotency_key;

    END IF;

    -- ========================================================
    -- 10. Respuesta
    -- ========================================================

    order_id := v_order_id;
    total_amount := v_total;
    commission_amount := v_commission_amount;
    currency := 'USD';
    status := 'pending';

    RETURN NEXT;

END;
$$;