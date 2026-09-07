-- ============================================================
-- 012_create_pending_order_batch.sql
-- Transactional multi-product checkout
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
SET search_path = ''
AS $$
DECLARE
    v_order_id uuid;
    v_item jsonb;
    v_product_id uuid;
    v_quantity integer;
    v_title text;
    v_unit_price numeric(20,2);
    v_store_id uuid;
    v_stock integer;
    v_available integer;
    v_reserved integer;
    v_subtotal numeric(20,2);
    v_total numeric(20,2) := 0;
    v_affiliate_id uuid;
    v_commission_rate numeric(7,4) := 0;
    v_commission_amount numeric(20,2) := 0;
    v_existing public.idempotency_keys%ROWTYPE;
    v_request_hash text;
BEGIN
    IF p_buyer_id IS NULL THEN
        RAISE EXCEPTION 'buyer_required' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = p_buyer_id
    ) THEN
        RAISE EXCEPTION 'buyer_not_found' USING ERRCODE = '23503';
    END IF;

    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0
       OR jsonb_array_length(p_items) > 100
    THEN
        RAISE EXCEPTION 'invalid_items' USING ERRCODE = '22023';
    END IF;

    v_request_hash := encode(
        extensions.digest(
            jsonb_build_object(
                'items', p_items,
                'affiliate_ref', NULLIF(btrim(p_affiliate_ref), '')
            )::text,
            'sha256'
        ),
        'hex'
    );

    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing
        FROM public.idempotency_keys
        WHERE user_id = p_buyer_id
          AND endpoint = '/api/checkout'
          AND idempotency_key = p_idempotency_key
        FOR UPDATE;

        IF FOUND THEN
            IF v_existing.request_hash <> v_request_hash THEN
                RAISE EXCEPTION 'idempotency_key_reuse' USING ERRCODE = '23505';
            END IF;

            IF v_existing.expires_at >= now()
               AND v_existing.resource_id IS NOT NULL
            THEN
                SELECT o.id, o.total_amount, o.affiliate_commission, o.currency, o.status::text
                INTO order_id, total_amount, commission_amount, currency, status
                FROM public.orders o
                WHERE o.id = v_existing.resource_id;

                IF FOUND THEN
                    RETURN NEXT;
                    RETURN;
                END IF;
            END IF;

            IF v_existing.expires_at >= now() THEN
                RAISE EXCEPTION 'idempotency_in_progress' USING ERRCODE = '23505';
            END IF;

            DELETE FROM public.idempotency_keys WHERE id = v_existing.id;
        END IF;

        INSERT INTO public.idempotency_keys (
            user_id, idempotency_key, request_hash, endpoint,
            locked_at, expires_at
        )
        VALUES (
            p_buyer_id, p_idempotency_key, v_request_hash, '/api/checkout',
            now(), now() + interval '24 hours'
        );
    END IF;

    IF p_affiliate_ref IS NOT NULL AND btrim(p_affiliate_ref) <> '' THEN
        SELECT a.id, a.commission_rate
        INTO v_affiliate_id, v_commission_rate
        FROM public.affiliates a
        WHERE a.code = btrim(p_affiliate_ref)
          AND a.is_active = true
          AND a.user_id <> p_buyer_id
        LIMIT 1;

        IF v_affiliate_id IS NULL THEN
            RAISE EXCEPTION 'invalid_affiliate' USING ERRCODE = '23514';
        END IF;
    END IF;

    INSERT INTO public.orders (
        buyer_id, status, currency, subtotal_amount, total_amount,
        platform_commission, seller_amount, affiliate_id,
        affiliate_commission, region, payment_status, expires_at
    )
    VALUES (
        p_buyer_id, 'pending', 'USD', 0, 0,
        0, 0, v_affiliate_id,
        0, 'GLOBAL', 'pending', now() + interval '24 hours'
    )
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        BEGIN
            v_product_id := (v_item ->> 'product_id')::uuid;
            v_quantity := (v_item ->> 'quantity')::integer;
        EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'invalid_product_item' USING ERRCODE = '22023';
        END;

        IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 100 THEN
            RAISE EXCEPTION 'invalid_product_item' USING ERRCODE = '22023';
        END IF;

        SELECT p.title, p.price, p.stock, p.store_id
        INTO v_title, v_unit_price, v_stock, v_store_id
        FROM public.products p
        WHERE p.id = v_product_id
          AND p.is_active = true
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'product_not_available' USING ERRCODE = 'P0002';
        END IF;

        INSERT INTO public.inventory (
            product_id, available_quantity, reserved_quantity
        )
        VALUES (
            v_product_id, v_stock, 0
        )
        ON CONFLICT (product_id) DO NOTHING;

        SELECT i.available_quantity, i.reserved_quantity
        INTO v_available, v_reserved
        FROM public.inventory i
        WHERE i.product_id = v_product_id
        FOR UPDATE;

        IF v_available < v_quantity THEN
            RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = '23514';
        END IF;

        v_subtotal := public.money_round(v_unit_price * v_quantity);
        v_total := public.money_round(v_total + v_subtotal);

        INSERT INTO public.order_items (
            order_id, product_id, store_id, product_title,
            quantity, unit_price, subtotal
        )
        VALUES (
            v_order_id, v_product_id, v_store_id, v_title,
            v_quantity, v_unit_price, v_subtotal
        );

        UPDATE public.inventory
        SET available_quantity = available_quantity - v_quantity,
            reserved_quantity = reserved_quantity + v_quantity,
            updated_at = now()
        WHERE product_id = v_product_id
          AND available_quantity >= v_quantity;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'inventory_race_condition' USING ERRCODE = '40001';
        END IF;

        UPDATE public.products
        SET stock = stock - v_quantity,
            updated_at = now()
        WHERE id = v_product_id
          AND stock >= v_quantity;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'product_stock_race_condition' USING ERRCODE = '40001';
        END IF;

        INSERT INTO public.inventory_reservations (
            order_id, product_id, quantity, status, expires_at
        )
        VALUES (
            v_order_id, v_product_id, v_quantity, 'reserved',
            now() + interval '24 hours'
        );

        INSERT INTO public.inventory_movements (
            product_id, order_id, movement_type, quantity,
            quantity_before, quantity_after, reason, created_by
        )
        VALUES (
            v_product_id, v_order_id, 'reservation', v_quantity,
            v_available, v_available - v_quantity,
            'Checkout reservation', p_buyer_id
        );
    END LOOP;

    IF v_affiliate_id IS NOT NULL THEN
        v_commission_amount := public.calculate_commission(v_total, v_commission_rate);

        INSERT INTO public.affiliate_attributions (
            affiliate_id, order_id, buyer_id, referral_code,
            commission_rate, commission_base, commission_amount, status
        )
        VALUES (
            v_affiliate_id, v_order_id, p_buyer_id, btrim(p_affiliate_ref),
            v_commission_rate, v_total, v_commission_amount, 'pending'
        );
    END IF;

    UPDATE public.orders
    SET subtotal_amount = v_total,
        total_amount = v_total,
        affiliate_commission = v_commission_amount,
        seller_amount = public.calculate_seller_amount(v_total, v_commission_amount),
        updated_at = now()
    WHERE id = v_order_id;

    INSERT INTO public.order_status_history (
        order_id, from_status, to_status, changed_by, reason
    )
    VALUES (
        v_order_id, NULL, 'pending', p_buyer_id, 'Order created'
    );

    IF p_idempotency_key IS NOT NULL THEN
        UPDATE public.idempotency_keys
        SET status_code = 201,
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

    order_id := v_order_id;
    total_amount := v_total;
    commission_amount := v_commission_amount;
    currency := 'USD';
    status := 'pending';
    RETURN NEXT;
END;
$$;
