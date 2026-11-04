-- Restores the empty marketing ads / audience / experiments schema present in Production.
-- The source tables were created out-of-band and had no matching active migration in Git.
-- This migration intentionally creates schema only; no Production campaign, audience or event rows are copied.

CREATE TABLE IF NOT EXISTS public.marketing_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  audience_type text NOT NULL,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  membership_days integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_audiences_audience_type_check
    CHECK (audience_type IN ('custom','retargeting','lookalike','interest','contextual','saved')),
  CONSTRAINT marketing_audiences_membership_days_check
    CHECK (membership_days BETWEEN 1 AND 540),
  CONSTRAINT marketing_audiences_name_check
    CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  CONSTRAINT marketing_audiences_status_check
    CHECK (status IN ('active','paused','archived'))
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  objective text NOT NULL DEFAULT 'sales',
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  daily_budget numeric NOT NULL DEFAULT 0,
  lifetime_budget numeric,
  start_at timestamptz,
  end_at timestamptz,
  optimization_goal text NOT NULL DEFAULT 'conversions',
  bid_strategy text NOT NULL DEFAULT 'auto',
  destination_url text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  live_room_id uuid REFERENCES public.chat_live_rooms(id) ON DELETE SET NULL,
  audience_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  placement_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  attribution_config jsonb NOT NULL DEFAULT '{"view_window_days":1,"click_window_days":7}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_campaigns_currency_check CHECK (char_length(currency) = 3),
  CONSTRAINT marketing_campaigns_daily_budget_check CHECK (daily_budget >= 0),
  CONSTRAINT marketing_campaigns_lifetime_budget_check CHECK (lifetime_budget IS NULL OR lifetime_budget >= 0),
  CONSTRAINT marketing_campaigns_name_check CHECK (char_length(btrim(name)) BETWEEN 2 AND 180),
  CONSTRAINT marketing_campaigns_objective_check
    CHECK (objective IN ('awareness','traffic','engagement','leads','sales','catalog','live_attendance')),
  CONSTRAINT marketing_campaigns_status_check
    CHECK (status IN ('draft','review','active','paused','completed','archived'))
);

CREATE TABLE IF NOT EXISTS public.marketing_ad_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  audience_id uuid REFERENCES public.marketing_audiences(id) ON DELETE SET NULL,
  audience_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  placements jsonb NOT NULL DEFAULT '["credi_wall","credi_story","credi_reel","credi_marketplace","credi_live"]'::jsonb,
  schedule_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  daily_budget numeric NOT NULL DEFAULT 0,
  bid_strategy text NOT NULL DEFAULT 'auto',
  optimization_goal text NOT NULL DEFAULT 'conversions',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_ad_sets_daily_budget_check CHECK (daily_budget >= 0),
  CONSTRAINT marketing_ad_sets_name_check CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  CONSTRAINT marketing_ad_sets_status_check
    CHECK (status IN ('draft','active','paused','completed','archived'))
);

CREATE TABLE IF NOT EXISTS public.marketing_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id uuid NOT NULL REFERENCES public.marketing_ad_sets(id) ON DELETE CASCADE,
  name text NOT NULL,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_texts jsonb NOT NULL DEFAULT '[]'::jsonb,
  headlines jsonb NOT NULL DEFAULT '[]'::jsonb,
  call_to_action text NOT NULL DEFAULT 'Comprar',
  destination_url text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  creative_hash text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_creatives_name_check CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  CONSTRAINT marketing_creatives_status_check
    CHECK (status IN ('draft','review','active','paused','archived'))
);

CREATE TABLE IF NOT EXISTS public.marketing_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id uuid NOT NULL REFERENCES public.marketing_ad_sets(id) ON DELETE CASCADE,
  creative_id uuid NOT NULL REFERENCES public.marketing_creatives(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  delivery_state text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_ads_ad_set_id_creative_id_key UNIQUE (ad_set_id, creative_id),
  CONSTRAINT marketing_ads_name_check CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  CONSTRAINT marketing_ads_status_check
    CHECK (status IN ('draft','review','active','paused','completed','archived'))
);

CREATE TABLE IF NOT EXISTS public.marketing_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  variable text NOT NULL,
  allocation_mode text NOT NULL DEFAULT 'equal',
  start_at timestamptz,
  end_at timestamptz,
  success_metric text NOT NULL DEFAULT 'purchases',
  minimum_sample_size bigint NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_experiments_allocation_mode_check CHECK (allocation_mode IN ('equal','weighted')),
  CONSTRAINT marketing_experiments_minimum_sample_size_check CHECK (minimum_sample_size > 0),
  CONSTRAINT marketing_experiments_name_check CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  CONSTRAINT marketing_experiments_status_check
    CHECK (status IN ('draft','running','completed','paused','cancelled')),
  CONSTRAINT marketing_experiments_success_metric_check
    CHECK (success_metric IN ('impressions','clicks','views','engagements','leads','purchases','revenue','roas')),
  CONSTRAINT marketing_experiments_variable_check
    CHECK (variable IN ('creative','audience','placement','bid_strategy','destination','offer'))
);

CREATE TABLE IF NOT EXISTS public.marketing_experiment_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.marketing_experiments(id) ON DELETE CASCADE,
  name text NOT NULL,
  allocation_percent numeric NOT NULL DEFAULT 50,
  creative_id uuid REFERENCES public.marketing_creatives(id) ON DELETE SET NULL,
  audience_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  placement_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  bid_strategy text,
  destination_url text,
  metric_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_experiment_variants_allocation_percent_check
    CHECK (allocation_percent > 0 AND allocation_percent <= 100),
  CONSTRAINT marketing_experiment_variants_name_check
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120)
);

CREATE TABLE IF NOT EXISTS public.marketing_conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  ad_id uuid REFERENCES public.marketing_ads(id) ON DELETE SET NULL,
  experiment_id uuid REFERENCES public.marketing_experiments(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.marketing_experiment_variants(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  operation_id uuid,
  event_name text NOT NULL,
  event_value numeric,
  currency text,
  source text NOT NULL DEFAULT 'credi',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_conversion_events_currency_check CHECK (currency IS NULL OR char_length(currency) = 3),
  CONSTRAINT marketing_conversion_events_event_name_check
    CHECK (event_name IN ('view','video_view','click','lead','add_to_cart','checkout_started','purchase','refund'))
);

CREATE INDEX IF NOT EXISTS marketing_audiences_owner_idx
  ON public.marketing_audiences(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_campaigns_live_room_idx
  ON public.marketing_campaigns(live_room_id);
CREATE INDEX IF NOT EXISTS marketing_campaigns_owner_idx
  ON public.marketing_campaigns(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_campaigns_product_idx
  ON public.marketing_campaigns(product_id);
CREATE INDEX IF NOT EXISTS marketing_campaigns_status_idx
  ON public.marketing_campaigns(status, start_at);
CREATE INDEX IF NOT EXISTS marketing_ad_sets_audience_idx
  ON public.marketing_ad_sets(audience_id);
CREATE INDEX IF NOT EXISTS marketing_ad_sets_campaign_idx
  ON public.marketing_ad_sets(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_creatives_ad_set_idx
  ON public.marketing_creatives(ad_set_id, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_creatives_product_idx
  ON public.marketing_creatives(product_id);
CREATE INDEX IF NOT EXISTS marketing_ads_ad_set_idx
  ON public.marketing_ads(ad_set_id, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_ads_creative_idx
  ON public.marketing_ads(creative_id);
CREATE INDEX IF NOT EXISTS marketing_experiments_campaign_idx
  ON public.marketing_experiments(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_experiments_owner_idx
  ON public.marketing_experiments(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_experiment_variants_creative_idx
  ON public.marketing_experiment_variants(creative_id);
CREATE INDEX IF NOT EXISTS marketing_experiment_variants_experiment_idx
  ON public.marketing_experiment_variants(experiment_id, created_at);
CREATE INDEX IF NOT EXISTS marketing_conversion_events_actor_idx
  ON public.marketing_conversion_events(actor_id);
CREATE INDEX IF NOT EXISTS marketing_conversion_events_campaign_idx
  ON public.marketing_conversion_events(campaign_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS marketing_conversion_events_operation_idx
  ON public.marketing_conversion_events(operation_id, occurred_at DESC);

ALTER TABLE public.marketing_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_conversion_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_audiences_owner_all ON public.marketing_audiences;
CREATE POLICY marketing_audiences_owner_all ON public.marketing_audiences
FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS marketing_campaigns_owner_all ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_owner_all ON public.marketing_campaigns
FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS marketing_ad_sets_owner_all ON public.marketing_ad_sets;
CREATE POLICY marketing_ad_sets_owner_all ON public.marketing_ad_sets
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_campaigns c
    WHERE c.id = marketing_ad_sets.campaign_id
      AND (c.owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.marketing_campaigns c
    WHERE c.id = marketing_ad_sets.campaign_id
      AND (c.owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
  )
);

DROP POLICY IF EXISTS marketing_creatives_owner_all ON public.marketing_creatives;
CREATE POLICY marketing_creatives_owner_all ON public.marketing_creatives
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.marketing_ad_sets s
    JOIN public.marketing_campaigns c ON c.id = s.campaign_id
    WHERE s.id = marketing_creatives.ad_set_id
      AND (c.owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.marketing_ad_sets s
    JOIN public.marketing_campaigns c ON c.id = s.campaign_id
    WHERE s.id = marketing_creatives.ad_set_id
      AND (c.owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
  )
);

DROP POLICY IF EXISTS marketing_ads_owner_all ON public.marketing_ads;
CREATE POLICY marketing_ads_owner_all ON public.marketing_ads
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.marketing_ad_sets s
    JOIN public.marketing_campaigns c ON c.id = s.campaign_id
    WHERE s.id = marketing_ads.ad_set_id
      AND (c.owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.marketing_ad_sets s
    JOIN public.marketing_campaigns c ON c.id = s.campaign_id
    WHERE s.id = marketing_ads.ad_set_id
      AND (c.owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
  )
);

DROP POLICY IF EXISTS marketing_experiments_owner_all ON public.marketing_experiments;
CREATE POLICY marketing_experiments_owner_all ON public.marketing_experiments
FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS marketing_experiment_variants_owner_all ON public.marketing_experiment_variants;
CREATE POLICY marketing_experiment_variants_owner_all ON public.marketing_experiment_variants
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_experiments e
    WHERE e.id = marketing_experiment_variants.experiment_id
      AND (e.owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.marketing_experiments e
    WHERE e.id = marketing_experiment_variants.experiment_id
      AND (e.owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
  )
);

DROP POLICY IF EXISTS marketing_conversion_events_auth_insert ON public.marketing_conversion_events;
CREATE POLICY marketing_conversion_events_auth_insert ON public.marketing_conversion_events
FOR INSERT TO authenticated
WITH CHECK (actor_id IS NULL OR actor_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS marketing_conversion_events_owner_select ON public.marketing_conversion_events;
CREATE POLICY marketing_conversion_events_owner_select ON public.marketing_conversion_events
FOR SELECT TO authenticated
USING (
  campaign_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.marketing_campaigns c
    WHERE c.id = marketing_conversion_events.campaign_id
      AND (c.owner_id = (SELECT auth.uid()) OR (SELECT is_admin()))
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.marketing_audiences, public.marketing_campaigns, public.marketing_ad_sets,
  public.marketing_creatives, public.marketing_ads, public.marketing_experiments,
  public.marketing_experiment_variants, public.marketing_conversion_events
TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE
  public.marketing_audiences, public.marketing_campaigns, public.marketing_ad_sets,
  public.marketing_creatives, public.marketing_ads, public.marketing_experiments,
  public.marketing_experiment_variants, public.marketing_conversion_events
TO service_role;
