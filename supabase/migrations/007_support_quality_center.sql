-- Credi Marketplace: unified support, feedback and quality tracking.
-- All exposed tables use RLS. Administrative privileges are derived from
-- public.profiles.role, never from user-editable user_metadata.

BEGIN;

CREATE TABLE IF NOT EXISTS public.support_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE DEFAULT (
    'CR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'support'
    CHECK (source IN ('support', 'feedback', 'technical', 'quality')),
  category TEXT NOT NULL
    CHECK (category IN ('account', 'orders', 'payments', 'products', 'chat', 'affiliate', 'b2b', 'live', 'security', 'technical', 'suggestion', 'other')),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 5 AND 180),
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 10000),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'triaged', 'assigned', 'in_progress', 'verification', 'resolved', 'reopened', 'not_planned')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('critical', 'high', 'normal', 'improvement')),
  linked_case_id UUID REFERENCES public.support_cases(id) ON DELETE SET NULL,
  resolution_summary TEXT CHECK (resolution_summary IS NULL OR char_length(resolution_summary) <= 5000),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_cases_user_created_idx
  ON public.support_cases (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_cases_queue_idx
  ON public.support_cases (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS support_cases_assignee_idx
  ON public.support_cases (assigned_to, status);

CREATE TABLE IF NOT EXISTS public.support_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created', 'message', 'status_changed', 'assigned', 'priority_changed', 'ai_summary', 'technical_link', 'resolution', 'reopened')),
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 10000),
  visibility TEXT NOT NULL DEFAULT 'user'
    CHECK (visibility IN ('user', 'internal')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_case_events_case_created_idx
  ON public.support_case_events (case_id, created_at);

CREATE TABLE IF NOT EXISTS public.product_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_case_id UUID REFERENCES public.support_cases(id) ON DELETE SET NULL,
  category TEXT NOT NULL
    CHECK (category IN ('navigation', 'marketplace', 'social', 'affiliate', 'b2b', 'live', 'chat', 'payments', 'security', 'accessibility', 'other')),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 5 AND 180),
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 10000),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'evaluating', 'approved', 'in_development', 'published', 'not_planned', 'duplicate')),
  vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_feedback_status_created_idx
  ON public.product_feedback (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.quality_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.support_cases(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('user_report', 'e2e', 'api', 'performance', 'security', 'manual_review')),
  severity TEXT NOT NULL
    CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 5 AND 180),
  summary TEXT NOT NULL CHECK (char_length(trim(summary)) BETWEEN 10 AND 10000),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(evidence) = 'object'),
  suggested_action TEXT CHECK (suggested_action IS NULL OR char_length(suggested_action) <= 5000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'accepted', 'dismissed', 'fixed', 'verified')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quality_findings_status_severity_idx
  ON public.quality_findings (status, severity, created_at DESC);

ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_findings ENABLE ROW LEVEL SECURITY;

-- Users can see and create their own cases. Only admins can manage queue state.
DROP POLICY IF EXISTS support_cases_select_own_or_admin ON public.support_cases;
CREATE POLICY support_cases_select_own_or_admin ON public.support_cases
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS support_cases_insert_own ON public.support_cases;
CREATE POLICY support_cases_insert_own ON public.support_cases
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS support_cases_admin_update ON public.support_cases;
CREATE POLICY support_cases_admin_update ON public.support_cases
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS support_cases_admin_delete ON public.support_cases;
CREATE POLICY support_cases_admin_delete ON public.support_cases
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS support_case_events_select_related ON public.support_case_events;
CREATE POLICY support_case_events_select_related ON public.support_case_events
  FOR SELECT TO authenticated
  USING (
    (visibility = 'user' AND EXISTS (
      SELECT 1 FROM public.support_cases c
      WHERE c.id = case_id AND c.user_id = (SELECT auth.uid())
    ))
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS support_case_events_insert_related ON public.support_case_events;
CREATE POLICY support_case_events_insert_related ON public.support_case_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.support_cases c
        WHERE c.id = case_id AND c.user_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
      )
    )
    AND (
      visibility = 'user'
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS product_feedback_select_own_or_admin ON public.product_feedback;
CREATE POLICY product_feedback_select_own_or_admin ON public.product_feedback
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS product_feedback_insert_own ON public.product_feedback;
CREATE POLICY product_feedback_insert_own ON public.product_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS product_feedback_admin_update ON public.product_feedback;
CREATE POLICY product_feedback_admin_update ON public.product_feedback
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS quality_findings_admin_all ON public.quality_findings;
CREATE POLICY quality_findings_admin_all ON public.quality_findings
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

COMMIT;
