BEGIN;
CREATE TABLE IF NOT EXISTS public.communication_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('twilio')),
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processing','processed','failed')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);
CREATE TABLE IF NOT EXISTS public.affiliate_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  occurred_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processing','processed','failed')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.communication_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.communication_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.affiliate_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.communication_webhook_events TO service_role;
GRANT ALL ON TABLE public.affiliate_webhook_events TO service_role;
CREATE INDEX IF NOT EXISTS communication_webhook_events_status_received_idx ON public.communication_webhook_events(status, received_at);
CREATE INDEX IF NOT EXISTS affiliate_webhook_events_status_received_idx ON public.affiliate_webhook_events(status, received_at);
COMMENT ON TABLE public.communication_webhook_events IS 'Private idempotent inbox for verified Twilio callbacks; no client access.';
COMMENT ON TABLE public.affiliate_webhook_events IS 'Private inbox for signed normalized partner events; does not credit commissions.';
COMMIT;
