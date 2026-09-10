-- Credi Marketplace
-- MIGRATION 022: Free plan default

CREATE OR REPLACE FUNCTION public.current_user_plan(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(plan_id UUID, plan_code TEXT, plan_name TEXT, status TEXT, billing_interval TEXT, limits JSONB)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH active AS (
    SELECT p.id, p.code, p.name, s.status, s.billing_interval, p.limits, s.created_at
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.user_id = p_user_id
      AND s.status IN ('trialing','active','past_due','paused')
    ORDER BY s.created_at DESC
    LIMIT 1
  )
  SELECT id, code, name, status, billing_interval, limits FROM active
  UNION ALL
  SELECT p.id, p.code, p.name, 'active', 'free', p.limits
  FROM public.plans p
  WHERE p.code = 'free'
    AND p.is_active = TRUE
    AND NOT EXISTS (SELECT 1 FROM active)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_plan_feature(
  p_feature_key TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.current_user_plan(p_user_id) c
    JOIN public.plan_features pf ON pf.plan_id = c.plan_id
    WHERE pf.feature_key = p_feature_key
      AND pf.enabled = TRUE
  );
$$;
