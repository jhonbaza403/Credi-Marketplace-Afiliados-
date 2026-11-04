-- Restores the AI conversation session store from the Production schema.
-- Only the empty schema is created in isolated Preview; no session IDs or response IDs
-- are copied from Production.

CREATE TABLE IF NOT EXISTS public.ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'copilot',
  last_response_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_sessions_mode_check
    CHECK (mode IN ('copilot','strategy','marketing','sales','intelligence')),
  CONSTRAINT ai_sessions_user_id_id_key UNIQUE (user_id,id)
);

CREATE INDEX IF NOT EXISTS ai_sessions_user_updated_idx
  ON public.ai_sessions(user_id,updated_at DESC);

ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_sessions_owner_all ON public.ai_sessions;
CREATE POLICY ai_sessions_owner_all ON public.ai_sessions
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.ai_sessions TO anon,authenticated;
GRANT ALL PRIVILEGES ON TABLE public.ai_sessions TO service_role;
