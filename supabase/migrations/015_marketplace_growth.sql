-- ============================================================
-- 015_marketplace_growth.sql
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
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_user
ON public.affiliate_clicks(user_id);

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
CREATE INDEX IF NOT EXISTS idx_affiliate_ledger_order
ON public.affiliate_commission_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_ledger_attribution
ON public.affiliate_commission_ledger(attribution_id);

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
SET search_path = ''
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
FOR EACH ROW EXECUTE FUNCTION public.set_b2b_crypto_payment_updated_at();

CREATE OR REPLACE FUNCTION public.create_affiliate_commission_ledger_entry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    affiliate_rate numeric(7,4);
    commission_value numeric(20,8);
BEGIN
    IF NEW.affiliate_id IS NULL
       OR NEW.payment_status <> 'paid'
       OR NEW.affiliate_commission <= 0
    THEN
        RETURN NEW;
    END IF;

    SELECT a.commission_rate
      INTO affiliate_rate
      FROM public.affiliates a
     WHERE a.id = NEW.affiliate_id
       AND a.is_active = true;

    IF affiliate_rate IS NULL THEN
        RETURN NEW;
    END IF;

    commission_value := NEW.affiliate_commission;

    INSERT INTO public.affiliate_commission_ledger (
        affiliate_id, order_id, currency, gross_amount,
        commission_rate, commission_amount, status, source
    )
    SELECT
        NEW.affiliate_id,
        NEW.id,
        NEW.currency,
        NEW.subtotal_amount,
        affiliate_rate,
        commission_value,
        'approved',
        'marketplace'
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.affiliate_commission_ledger l
        WHERE l.order_id = NEW.id
          AND l.source = 'marketplace'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_affiliate_commission_ledger
ON public.orders;
CREATE TRIGGER trg_create_affiliate_commission_ledger
AFTER INSERT OR UPDATE OF payment_status, affiliate_id, affiliate_commission
ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_affiliate_commission_ledger_entry();

-- Server-owned telemetry/ledger/payment tables. RLS blocks direct client writes.
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_crypto_payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS affiliate_clicks_select_own ON public.affiliate_clicks;
CREATE POLICY affiliate_clicks_select_own
ON public.affiliate_clicks FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS b2b_crypto_payment_select_own ON public.b2b_crypto_payment_intents;
CREATE POLICY b2b_crypto_payment_select_own
ON public.b2b_crypto_payment_intents FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = b2b_crypto_payment_intents.order_id
          AND o.buyer_id = auth.uid()
    )
);
