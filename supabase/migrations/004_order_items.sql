-- ============================================================
-- Credi Marketplace
-- MIGRATION 004: Order Items
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL
        REFERENCES public.orders(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES public.products(id)
        ON DELETE RESTRICT,

    store_id UUID NOT NULL
        REFERENCES public.stores(id)
        ON DELETE RESTRICT,

    product_title TEXT NOT NULL,

    quantity INTEGER NOT NULL,

    unit_price NUMERIC(19,4) NOT NULL,

    subtotal NUMERIC(19,4) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT order_items_quantity_positive
        CHECK (quantity > 0),

    CONSTRAINT order_items_unit_price_non_negative
        CHECK (unit_price >= 0),

    CONSTRAINT order_items_subtotal_non_negative
        CHECK (subtotal >= 0),

    CONSTRAINT order_items_subtotal_integrity
        CHECK (
            subtotal = ROUND(unit_price * quantity, 4)
        )
);

COMMIT;