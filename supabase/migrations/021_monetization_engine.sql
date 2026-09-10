-- Credi Marketplace
-- MIGRATION 021: Monetization Engine

BEGIN;

CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  feature_key TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'subscription' CHECK (source IN ('subscription','admin','promotion','system')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quota BIGINT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  quantity BIGINT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, metric_key, period_start)
);

CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription','one_time','ad_campaign','promotion','marketplace_fee')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  provider TEXT,
  provider_transaction_id TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  UNIQUE (provider, provider_transaction_id)
);

CREATE TABLE IF NOT EXISTS public.advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  company_name TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  budget_minor BIGINT NOT NULL DEFAULT 0 CHECK (budget_minor >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','cancelled')),
  objective TEXT NOT NULL DEFAULT 'traffic' CHECK (objective IN ('traffic','engagement','conversion','awareness')),
  budget_minor BIGINT NOT NULL DEFAULT 0 CHECK (budget_minor >= 0),
  spent_minor BIGINT NOT NULL DEFAULT 0 CHECK (spent_minor >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  targeting JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  media_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  creative_id UUID REFERENCES public.ad_creatives(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression','click','conversion')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  placement TEXT,
  amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.promoted_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','cancelled')),
  placement TEXT NOT NULL DEFAULT 'feed' CHECK (placement IN ('feed','search','category','home','featured')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  budget_minor BIGINT NOT NULL DEFAULT 0 CHECK (budget_minor >= 0),
  spent_minor BIGINT NOT NULL DEFAULT 0 CHECK (spent_minor >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('subscription','advertising','promotion','marketplace_commission','affiliate','service')),
  source_id UUID,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','recognized','refunded','void')),
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  recognized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plan_entitlements_user_idx ON public.plan_entitlements(user_id, feature_key);
CREATE INDEX IF NOT EXISTS usage_counters_user_metric_idx ON public.usage_counters(user_id, metric_key, period_start DESC);
CREATE INDEX IF NOT EXISTS billing_transactions_user_idx ON public.billing_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS advertisers_user_idx ON public.advertisers(user_id);
CREATE INDEX IF NOT EXISTS ad_campaigns_status_idx ON public.ad_campaigns(status, starts_at);
CREATE INDEX IF NOT EXISTS ad_events_campaign_idx ON public.ad_events(campaign_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS promoted_listings_active_idx ON public.promoted_listings(status, placement, starts_at);
CREATE INDEX IF NOT EXISTS platform_revenue_source_idx ON public.platform_revenue(source_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.period_usage(p_user_id UUID, p_metric_key TEXT, p_period_start DATE, p_period_end DATE)
RETURNS BIGINT LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT COALESCE((SELECT quantity FROM public.usage_counters WHERE user_id = p_user_id AND metric_key = p_metric_key AND period_start = p_period_start AND period_end = p_period_end), 0);
$$;

CREATE OR REPLACE FUNCTION public.increment_usage(p_metric_key TEXT, p_quantity BIGINT DEFAULT 1, p_user_id UUID DEFAULT auth.uid())
RETURNS BIGINT LANGUAGE PLPGSQL SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_start DATE := date_trunc('month', current_date)::date;
  v_end DATE := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  v_value BIGINT;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'quantity must be positive'; END IF;
  INSERT INTO public.usage_counters(user_id, metric_key, period_start, period_end, quantity)
  VALUES (p_user_id, p_metric_key, v_start, v_end, p_quantity)
  ON CONFLICT (user_id, metric_key, period_start)
  DO UPDATE SET quantity = public.usage_counters.quantity + EXCLUDED.quantity, updated_at = NOW()
  RETURNING quantity INTO v_value;
  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_entitlement(p_feature_key TEXT, p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(enabled BOOLEAN, quota BIGINT, plan_code TEXT)
LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT pf.enabled, pf.quota, p.code
  FROM public.current_user_plan(p_user_id) c
  JOIN public.plan_features pf ON pf.plan_id = c.plan_id
  JOIN public.plans p ON p.id = c.plan_id
  WHERE pf.feature_key = p_feature_key AND pf.enabled = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.record_platform_revenue(
  p_source_type TEXT,
  p_amount_minor BIGINT,
  p_currency CHAR(3),
  p_source_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF p_amount_minor < 0 THEN RAISE EXCEPTION 'amount must be non-negative'; END IF;
  INSERT INTO public.platform_revenue(source_type, source_id, order_id, amount_minor, currency, status, description, recognized_at)
  VALUES (p_source_type, p_source_id, p_order_id, p_amount_minor, p_currency, 'recognized', p_description, NOW())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoted_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_entitlements_owner_read ON public.plan_entitlements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY usage_owner_read ON public.usage_counters FOR SELECT USING (user_id = auth.uid());
CREATE POLICY billing_owner_read ON public.billing_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY advertisers_owner_read ON public.advertisers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ad_campaigns_owner_read ON public.ad_campaigns FOR SELECT USING (EXISTS (SELECT 1 FROM public.advertisers a WHERE a.id = advertiser_id AND a.user_id = auth.uid()));
CREATE POLICY ad_creatives_owner_read ON public.ad_creatives FOR SELECT USING (EXISTS (SELECT 1 FROM public.ad_campaigns c JOIN public.advertisers a ON a.id = c.advertiser_id WHERE c.id = campaign_id AND a.user_id = auth.uid()));
CREATE POLICY ad_events_owner_read ON public.ad_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.ad_campaigns c JOIN public.advertisers a ON a.id = c.advertiser_id WHERE c.id = campaign_id AND a.user_id = auth.uid()));
CREATE POLICY promoted_listings_owner_read ON public.promoted_listings FOR SELECT USING (owner_id = auth.uid());

REVOKE ALL ON public.platform_revenue FROM anon, authenticated;
REVOKE ALL ON public.ad_events FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.period_usage(UUID, TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(TEXT, BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_entitlement(TEXT, UUID) TO authenticated;

COMMIT;
