-- ============================================================
-- Credi Marketplace
-- MIGRATION 003: Orders
-- ============================================================

BEGIN;

DO $$
BEGIN
    CREATE TYPE public.order_status AS ENUM (
        'pending',
        'paid',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'failed',
        'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    buyer_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    status public.order_status NOT NULL DEFAULT 'pending',

    currency CHAR(3) NOT NULL DEFAULT 'USD',

    subtotal_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
    shipping_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(19,4) NOT NULL DEFAULT 0,

    total_amount NUMERIC(19,4) NOT NULL DEFAULT 0,

    platform_commission NUMERIC(19,4) NOT NULL DEFAULT 0,
    seller_amount NUMERIC(19,4) NOT NULL DEFAULT 0,

    affiliate_id UUID
        REFERENCES public.affiliates(id)
        ON DELETE SET NULL,

    affiliate_commission NUMERIC(19,4) NOT NULL DEFAULT 0,

    region TEXT NOT NULL DEFAULT 'GLOBAL',

    payment_status TEXT NOT NULL DEFAULT 'pending',

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    CONSTRAINT orders_currency_format
        CHECK (currency ~ '^[A-Z]{3}$'),

    CONSTRAINT orders_subtotal_non_negative
        CHECK (subtotal_amount >= 0),

    CONSTRAINT orders_shipping_non_negative
        CHECK (shipping_amount >= 0),

    CONSTRAINT orders_discount_non_negative
        CHECK (discount_amount >= 0),

    CONSTRAINT orders_tax_non_negative
        CHECK (tax_amount >= 0),

    CONSTRAINT orders_total_non_negative
        CHECK (total_amount >= 0),

    CONSTRAINT orders_platform_commission_non_negative
        CHECK (platform_commission >= 0),

    CONSTRAINT orders_seller_amount_non_negative
        CHECK (seller_amount >= 0),

    CONSTRAINT orders_affiliate_commission_non_negative
        CHECK (affiliate_commission >= 0),

    CONSTRAINT orders_payment_status
        CHECK (
            payment_status IN (
                'pending',
                'paid',
                'failed',
                'cancelled',
                'refunded'
            )
        )
);

DROP TRIGGER IF EXISTS trg_orders_updated_at
ON public.orders;

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;