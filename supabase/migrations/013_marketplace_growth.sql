-- ============================================================
-- 013_marketplace_growth.sql
-- Affiliate attribution, external provider clicks and B2B crypto
-- payment intents. No custody, exchange or private-key storage.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    provider text NOT NULL,
    destination text NOT NULL,
    session_id text,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT affiliate_clicks_provider_valid CHECK (
        provider IN ('amazon', 'shein', 'aliexpress', 'alibaba')
    )
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_created
ON public.affiliate_clicks(affiliate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_provider_created
ON public.affiliate_clicks(provider, created_at DESC);

CREATE TABLE IF NOT EXISTS public.affiliate_commission_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    attribution_id uuid REFERENCES public.affiliate_attributions(id) ON DELETE SET NULL,
    currency text NOT NULL,
    gross_amount numeric(20,8) NOT NULL DEFAULT 0,
    commission_rate numeric(7,4) NOT NULL DEFAULT 0,
    commission_amount numeric(20,8) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'pending',
    source text NOT NULL DEFAULT 'marketplace',
    created_at timestamptz NOT NULL DEFAULT now(),
    settled_at timestamptz,
    CONSTRAINT affiliate_ledger_status_valid CHECK (
        status IN ('pending', 'approved', 'paid', 'cancelled', 'reversed')
    ),
    CONSTRAINT affiliate_ledger_source_valid CHECK (
        source IN ('marketplace', 'external_provider')
    ),
    CONSTRAINT affiliate_ledger_amounts_valid CHECK (
        gross_amount >= 0 AND commission_rate >= 0 AND commission_rate <= 1
        AND commission_amount >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_affiliate_ledger_affiliate_status
ON public.affiliate_commission_ledger(affiliate_id, status);

CREATE TABLE IF NOT EXISTS public.b2b_crypto_payment_intents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    provider text NOT NULL,
    provider_payment_id text,
    currency text NOT NULL DEFAULT 'USDC',
    network text,
    amount_usd numeric(20,2) NOT NULL,
    status text NOT NULL DEFAULT 'created',
    checkout_url text,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT b2b_crypto_provider_valid CHECK (provider IN ('stripe', 'coinbase')),
    CONSTRAINT b2b_crypto_currency_valid CHECK (currency IN ('USDC', 'USDP', 'USDG')),
    CONSTRAINT b2b_crypto_status_valid CHECK (
        status IN ('created', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded', 'expired')
    ),
    CONSTRAINT b2b_crypto_amount_valid CHECK (amount_usd > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_b2b_crypto_provider_payment
ON public.b2b_crypto_payment_intents(provider, provider_payment_id)
WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_b2b_crypto_order
ON public.b2b_crypto_payment_intents(order_id);

CREATE OR REPLACE FUNCTION public.set_b2b_crypto_payment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b2b_crypto_payment_updated_at
ON public.b2b_crypto_payment_intents;

CREATE TRIGGER trg_b2b_crypto_payment_updated_at
BEFORE UPDATE ON public.b2b_crypto_payment_intents
FOR EACH ROW
EXECUTE FUNCTION public.set_b2b_crypto_payment_updated_at();
