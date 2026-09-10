-- Credi Marketplace
-- MIGRATION 023: Monetization security hardening

CREATE OR REPLACE FUNCTION public.set_updated_at_plans()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_platform_revenue(text,bigint,char(3),uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at_plans() FROM PUBLIC, anon, authenticated;
