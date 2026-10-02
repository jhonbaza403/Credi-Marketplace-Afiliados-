-- Credi Marketplace
-- MIGRATION 024: Revenue automation

CREATE TABLE IF NOT EXISTS public.checkout_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription','one_time','ad_campaign','promotion')),
  billing_interval TEXT CHECK (billing_interval IN ('free','monthly','yearly')),
  amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  provider TEXT,
  provider_checkout_id TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','pending','completed','failed','cancelled','expired')),
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS checkout_intents_user_idx ON public.checkout_intents(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS platform_revenue_order_commission_uniq
  ON public.platform_revenue(order_id)
  WHERE source_type = 'marketplace_commission' AND order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.recognize_order_platform_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.platform_commission > 0 THEN
    INSERT INTO public.platform_revenue (
      source_type, order_id, amount_minor, currency, status,
      description, recognized_at
    )
    VALUES (
      'marketplace_commission', NEW.id,
      ROUND(NEW.platform_commission * 100)::BIGINT,
      NEW.currency, 'recognized',
      'Comisión de Credi Marketplace por orden pagada', NOW()
    )
    ON CONFLICT (order_id)
    WHERE source_type = 'marketplace_commission' AND order_id IS NOT NULL
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recognize_order_platform_commission ON public.orders;
CREATE TRIGGER trg_recognize_order_platform_commission
AFTER INSERT OR UPDATE OF status, platform_commission
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.recognize_order_platform_commission();

ALTER TABLE public.checkout_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY checkout_intents_owner_read
ON public.checkout_intents FOR SELECT
USING (user_id = auth.uid());

GRANT SELECT ON public.checkout_intents TO authenticated;
REVOKE ALL ON public.platform_revenue FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recognize_order_platform_commission() FROM PUBLIC, anon, authenticated;
