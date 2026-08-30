-- ============================================================
-- 006_idempotency.sql
-- Idempotencia transaccional
-- Credi Marketplace
-- ============================================================

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,

    idempotency_key text NOT NULL,

    request_hash text NOT NULL,

    endpoint text NOT NULL,

    status_code integer,

    response_body jsonb,

    resource_type text,

    resource_id uuid,

    locked_at timestamptz,

    completed_at timestamptz,

    expires_at timestamptz NOT NULL
        DEFAULT (now() + interval '24 hours'),

    created_at timestamptz NOT NULL DEFAULT now(),

    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT idempotency_key_length
        CHECK (
            char_length(idempotency_key)
            BETWEEN 16 AND 255
        ),

    CONSTRAINT idempotency_endpoint_length
        CHECK (
            char_length(endpoint)
            BETWEEN 1 AND 255
        ),

    CONSTRAINT idempotency_request_hash_length
        CHECK (
            char_length(request_hash)
            BETWEEN 32 AND 128
        ),

    CONSTRAINT idempotency_status_code_valid
        CHECK (
            status_code IS NULL
            OR status_code BETWEEN 100 AND 599
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_idempotency_user_endpoint_key
ON public.idempotency_keys (
    user_id,
    endpoint,
    idempotency_key
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at
ON public.idempotency_keys (expires_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_resource
ON public.idempotency_keys (
    resource_type,
    resource_id
);

CREATE INDEX IF NOT EXISTS idx_idempotency_user
ON public.idempotency_keys (user_id);

CREATE OR REPLACE FUNCTION public.set_idempotency_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_idempotency_updated_at
ON public.idempotency_keys;

CREATE TRIGGER trg_idempotency_updated_at
BEFORE UPDATE ON public.idempotency_keys
FOR EACH ROW
EXECUTE FUNCTION public.set_idempotency_updated_at();

COMMENT ON TABLE public.idempotency_keys IS
'Protección contra repetición de operaciones críticas como checkout y pagos.';