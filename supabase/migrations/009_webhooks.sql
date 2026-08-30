-- ============================================================
-- 009_webhooks.sql
-- Webhooks + replay protection + idempotencia
-- ============================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    provider text NOT NULL,

    event_id text NOT NULL,

    event_type text NOT NULL,

    signature text,

    payload_hash text NOT NULL,

    payload jsonb NOT NULL,

    received_at timestamptz NOT NULL DEFAULT now(),

    processed_at timestamptz,

    failed_at timestamptz,

    processing_attempts integer NOT NULL DEFAULT 0,

    status text NOT NULL DEFAULT 'received',

    error_message text,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT webhook_status_valid
        CHECK (
            status IN (
                'received',
                'processing',
                'processed',
                'failed',
                'ignored'
            )
        ),

    CONSTRAINT webhook_attempts_valid
        CHECK (
            processing_attempts >= 0
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_webhook_provider_event
ON public.webhook_events (
    provider,
    event_id
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_webhook_provider_hash
ON public.webhook_events (
    provider,
    payload_hash
);

CREATE INDEX IF NOT EXISTS idx_webhook_status
ON public.webhook_events(status);

CREATE INDEX IF NOT EXISTS idx_webhook_received
ON public.webhook_events(received_at);

CREATE INDEX IF NOT EXISTS idx_webhook_type
ON public.webhook_events(
    provider,
    event_type
);