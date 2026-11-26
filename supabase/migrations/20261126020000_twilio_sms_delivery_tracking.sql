BEGIN;
CREATE TABLE IF NOT EXISTS public.twilio_sms_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  message_sid text UNIQUE,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','queued','accepted','sending','sent','delivered','undelivered','failed','canceled')),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS twilio_sms_requests_user_created_idx ON public.twilio_sms_requests(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.twilio_message_status_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_sid text NOT NULL,
  event_key text NOT NULL UNIQUE,
  message_status text NOT NULL CHECK (message_status IN ('accepted','queued','sending','sent','delivered','undelivered','failed','canceled','read')),
  error_code text,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS twilio_message_status_events_sid_received_idx ON public.twilio_message_status_events(message_sid, received_at DESC);
ALTER TABLE public.twilio_sms_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_message_status_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.twilio_sms_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.twilio_message_status_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.twilio_sms_requests TO service_role;
GRANT ALL ON TABLE public.twilio_message_status_events TO service_role;
REVOKE ALL ON SEQUENCE public.twilio_message_status_events_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.twilio_message_status_events_id_seq TO service_role;
COMMIT;
