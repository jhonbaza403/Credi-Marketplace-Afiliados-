-- Restore the remaining marketing metrics and social distribution schema present in Production.
-- The source tables contain zero rows in Production and are recreated as empty structures
-- in isolated Preview. No social account credentials or publication records are copied.

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS objective text NOT NULL DEFAULT 'sales',
  ADD COLUMN IF NOT EXISTS audience_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS placement_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS optimization_goal text NOT NULL DEFAULT 'conversions';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.advertisements'::regclass
      AND conname='advertisements_campaign_id_fkey'
  ) THEN
    ALTER TABLE public.advertisements
      ADD CONSTRAINT advertisements_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_ads_campaign
  ON public.advertisements(campaign_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  impressions bigint NOT NULL DEFAULT 0,
  reach bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  views bigint NOT NULL DEFAULT 0,
  engagements bigint NOT NULL DEFAULT 0,
  leads bigint NOT NULL DEFAULT 0,
  purchases bigint NOT NULL DEFAULT 0,
  spend numeric NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_daily_metrics_campaign_id_metric_date_key UNIQUE(campaign_id,metric_date),
  CONSTRAINT marketing_daily_metrics_impressions_check CHECK (impressions >= 0),
  CONSTRAINT marketing_daily_metrics_reach_check CHECK (reach >= 0),
  CONSTRAINT marketing_daily_metrics_clicks_check CHECK (clicks >= 0),
  CONSTRAINT marketing_daily_metrics_views_check CHECK (views >= 0),
  CONSTRAINT marketing_daily_metrics_engagements_check CHECK (engagements >= 0),
  CONSTRAINT marketing_daily_metrics_leads_check CHECK (leads >= 0),
  CONSTRAINT marketing_daily_metrics_purchases_check CHECK (purchases >= 0),
  CONSTRAINT marketing_daily_metrics_spend_check CHECK (spend >= 0),
  CONSTRAINT marketing_daily_metrics_revenue_check CHECK (revenue >= 0)
);

CREATE INDEX IF NOT EXISTS marketing_daily_metrics_campaign_idx
  ON public.marketing_daily_metrics(campaign_id,metric_date DESC);

CREATE TABLE IF NOT EXISTS public.marketing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  ad_id uuid REFERENCES public.marketing_ads(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  source text NOT NULL DEFAULT 'credi',
  session_id text,
  operation_id uuid,
  value numeric,
  currency text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_events_event_name_check
    CHECK (char_length(trim(event_name)) BETWEEN 2 AND 80)
);

CREATE INDEX IF NOT EXISTS marketing_events_actor_idx ON public.marketing_events(actor_id);
CREATE INDEX IF NOT EXISTS marketing_events_ad_idx ON public.marketing_events(ad_id);
CREATE INDEX IF NOT EXISTS marketing_events_campaign_idx ON public.marketing_events(campaign_id,created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_events_operation_idx ON public.marketing_events(operation_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  account_name text,
  credential_ciphertext text,
  credential_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_accounts_owner_id_provider_provider_account_id_key
    UNIQUE(owner_id,provider,provider_account_id),
  CONSTRAINT social_accounts_provider_valid
    CHECK (provider IN ('tiktok','tiktok_shop','youtube','instagram','facebook','threads','pinterest','linkedin')),
  CONSTRAINT social_accounts_status_valid
    CHECK (status IN ('active','expired','revoked','disconnected','error'))
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_owner
  ON public.social_accounts(owner_id,provider,status);

CREATE TABLE IF NOT EXISTS public.social_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  title text,
  caption text,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  publish_at timestamptz,
  provider_post_id text,
  provider_post_url text,
  last_error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_publications_attempts_valid CHECK (attempts >= 0),
  CONSTRAINT social_publications_provider_valid
    CHECK (provider IN ('tiktok','tiktok_shop','youtube','instagram','facebook','threads','pinterest','linkedin')),
  CONSTRAINT social_publications_status_valid
    CHECK (status IN ('queued','processing','published','partial','failed','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_social_publications_listing
  ON public.social_publications(listing_id);
CREATE INDEX IF NOT EXISTS idx_social_publications_owner_status
  ON public.social_publications(owner_id,status,publish_at);
CREATE INDEX IF NOT EXISTS idx_social_publications_queue
  ON public.social_publications(status,publish_at)
  WHERE status IN ('queued','processing');
CREATE INDEX IF NOT EXISTS idx_social_publications_social_account
  ON public.social_publications(social_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_social_publications_provider_post
  ON public.social_publications(provider,provider_post_id)
  WHERE provider_post_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_social_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_social_updated_at() TO PUBLIC, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_social_accounts_updated_at ON public.social_accounts;
CREATE TRIGGER trg_social_accounts_updated_at
BEFORE UPDATE ON public.social_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_social_updated_at();

DROP TRIGGER IF EXISTS trg_social_publications_updated_at ON public.social_publications;
CREATE TRIGGER trg_social_publications_updated_at
BEFORE UPDATE ON public.social_publications
FOR EACH ROW EXECUTE FUNCTION public.set_social_updated_at();

ALTER TABLE public.marketing_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_daily_metrics_owner_all ON public.marketing_daily_metrics;
CREATE POLICY marketing_daily_metrics_owner_all ON public.marketing_daily_metrics
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_campaigns c
    WHERE c.id=marketing_daily_metrics.campaign_id
      AND (c.owner_id=(SELECT auth.uid()) OR (SELECT public.is_admin()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.marketing_campaigns c
    WHERE c.id=marketing_daily_metrics.campaign_id
      AND (c.owner_id=(SELECT auth.uid()) OR (SELECT public.is_admin()))
  )
);

DROP POLICY IF EXISTS marketing_events_auth_insert ON public.marketing_events;
CREATE POLICY marketing_events_auth_insert ON public.marketing_events
FOR INSERT TO authenticated
WITH CHECK (actor_id=(SELECT auth.uid()) OR actor_id IS NULL);

DROP POLICY IF EXISTS marketing_events_owner_select ON public.marketing_events;
CREATE POLICY marketing_events_owner_select ON public.marketing_events
FOR SELECT TO authenticated
USING (
  campaign_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.marketing_campaigns c
    WHERE c.id=marketing_events.campaign_id
      AND (c.owner_id=(SELECT auth.uid()) OR (SELECT public.is_admin()))
  )
);

DROP POLICY IF EXISTS social_accounts_owner_all ON public.social_accounts;
CREATE POLICY social_accounts_owner_all ON public.social_accounts
FOR ALL TO authenticated
USING (owner_id=(SELECT auth.uid()) OR (SELECT public.is_admin()))
WITH CHECK (owner_id=(SELECT auth.uid()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS social_publications_owner_all ON public.social_publications;
CREATE POLICY social_publications_owner_all ON public.social_publications
FOR ALL TO authenticated
USING (owner_id=(SELECT auth.uid()) OR (SELECT public.is_admin()))
WITH CHECK (owner_id=(SELECT auth.uid()) OR (SELECT public.is_admin()));

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE
  public.marketing_daily_metrics,public.marketing_events
TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE
  public.social_accounts,public.social_publications
TO authenticated;
GRANT ALL PRIVILEGES ON TABLE
  public.marketing_daily_metrics,public.marketing_events,
  public.social_accounts,public.social_publications
TO service_role;
