-- ============================================================
-- 007_affiliates.sql
-- Sistema de afiliados
-- ============================================================

CREATE TABLE IF NOT EXISTS public.affiliates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    code text NOT NULL,

    name text,

    is_active boolean NOT NULL DEFAULT true,

    commission_rate numeric(7,4) NOT NULL DEFAULT 0.0500,

    created_at timestamptz NOT NULL DEFAULT now(),

    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT affiliates_code_valid
        CHECK (
            code ~ '^[A-Za-z0-9_-]{3,64}$'
        ),

    CONSTRAINT affiliates_commission_valid
        CHECK (
            commission_rate >= 0
            AND commission_rate <= 1
        ),

    CONSTRAINT affiliates_user_unique
        UNIQUE (user_id),

    CONSTRAINT affiliates_code_unique
        UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS public.affiliate_attributions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    affiliate_id uuid NOT NULL
        REFERENCES public.affiliates(id)
        ON DELETE RESTRICT,

    order_id uuid
        REFERENCES public.orders(id)
        ON DELETE SET NULL,

    buyer_id uuid
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    referral_code text NOT NULL,

    commission_rate numeric(7,4) NOT NULL,

    commission_base numeric(20,2) NOT NULL,

    commission_amount numeric(20,2) NOT NULL DEFAULT 0,

    status text NOT NULL DEFAULT 'pending',

    attributed_at timestamptz NOT NULL DEFAULT now(),

    settled_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT affiliate_attribution_status
        CHECK (
            status IN (
                'pending',
                'approved',
                'paid',
                'cancelled',
                'reversed'
            )
        ),

    CONSTRAINT affiliate_commission_rate_valid
        CHECK (
            commission_rate >= 0
            AND commission_rate <= 1
        ),

    CONSTRAINT affiliate_commission_base_valid
        CHECK (
            commission_base >= 0
        ),

    CONSTRAINT affiliate_commission_amount_valid
        CHECK (
            commission_amount >= 0
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_affiliate_order
ON public.affiliate_attributions(order_id)
WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_affiliates_code
ON public.affiliates(code);

CREATE INDEX IF NOT EXISTS idx_affiliates_user
ON public.affiliates(user_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_affiliate
ON public.affiliate_attributions(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_buyer
ON public.affiliate_attributions(buyer_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_status
ON public.affiliate_attributions(status);

CREATE OR REPLACE FUNCTION public.set_affiliate_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_affiliates_updated_at
ON public.affiliates;

CREATE TRIGGER trg_affiliates_updated_at
BEFORE UPDATE ON public.affiliates
FOR EACH ROW
EXECUTE FUNCTION public.set_affiliate_updated_at();