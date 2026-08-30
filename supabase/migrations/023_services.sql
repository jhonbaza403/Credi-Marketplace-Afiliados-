```sql
-- ============================================================
-- CREDI MARKETPLACE
-- MIGRATION 023
-- SERVICES / PROFESSIONAL MARKETPLACE
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. PROFESSIONALS
-- ============================================================

CREATE TABLE IF NOT EXISTS professionals (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    professional_name VARCHAR(200) NOT NULL,

    professional_title VARCHAR(200) NULL,

    bio TEXT NULL,

    category VARCHAR(150) NULL,

    license_number VARCHAR(150) NULL,

    location VARCHAR(200) NULL,

    hourly_rate NUMERIC(18,2) NULL,

    currency VARCHAR(3)
        NOT NULL DEFAULT 'USD',

    is_verified BOOLEAN
        NOT NULL DEFAULT FALSE,

    is_active BOOLEAN
        NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT professionals_user_unique
        UNIQUE (user_id),

    CONSTRAINT professionals_rate_valid
        CHECK (
            hourly_rate IS NULL
            OR hourly_rate >= 0
        )
);

-- ============================================================
-- 2. SERVICES
-- ============================================================

CREATE TABLE IF NOT EXISTS services (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    professional_id UUID NOT NULL,

    title VARCHAR(200) NOT NULL,

    slug VARCHAR(240) NOT NULL,

    description TEXT NOT NULL,

    category VARCHAR(150) NULL,

    price NUMERIC(18,2) NOT NULL DEFAULT 0,

    currency VARCHAR(3)
        NOT NULL DEFAULT 'USD',

    duration_minutes INTEGER NULL,

    is_active BOOLEAN
        NOT NULL DEFAULT TRUE,

    is_featured BOOLEAN
        NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT services_slug_unique
        UNIQUE (slug),

    CONSTRAINT services_price_valid
        CHECK (price >= 0),

    CONSTRAINT services_duration_valid
        CHECK (
            duration_minutes IS NULL
            OR duration_minutes > 0
        )
);

-- ============================================================
-- 3. SERVICE REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS service_requests (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    service_id UUID NOT NULL,

    client_id UUID NOT NULL,

    professional_id UUID NOT NULL,

    message TEXT NULL,

    requested_start_at TIMESTAMPTZ NULL,

    requested_end_at TIMESTAMPTZ NULL,

    agreed_price NUMERIC(18,2) NULL,

    currency VARCHAR(3)
        NOT NULL DEFAULT 'USD',

    status VARCHAR(40)
        NOT NULL DEFAULT 'requested',

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT service_request_status_valid
        CHECK (
            status IN (
                'requested',
                'accepted',
                'rejected',
                'scheduled',
                'in_progress',
                'completed',
                'cancelled',
                'disputed'
            )
        ),

    CONSTRAINT service_request_price_valid
        CHECK (
            agreed_price IS NULL
            OR agreed_price >= 0
        ),

    CONSTRAINT service_request_dates_valid
        CHECK (
            requested_end_at IS NULL
            OR requested_start_at IS NULL
            OR requested_end_at > requested_start_at
        )
);

-- ============================================================
-- 4. FOREIGN KEYS
-- ============================================================

DO $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'profiles'
    )
    AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'professionals_user_fk'
    ) THEN

        ALTER TABLE professionals
        ADD CONSTRAINT professionals_user_fk
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;

    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'services_professional_fk'
    ) THEN

        ALTER TABLE services
        ADD CONSTRAINT services_professional_fk
        FOREIGN KEY (professional_id)
        REFERENCES professionals(id)
        ON DELETE CASCADE;

    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'service_requests_service_fk'
    ) THEN

        ALTER TABLE service_requests
        ADD CONSTRAINT service_requests_service_fk
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE RESTRICT;

    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'service_requests_professional_fk'
    ) THEN

        ALTER TABLE service_requests
        ADD CONSTRAINT service_requests_professional_fk
        FOREIGN KEY (professional_id)
        REFERENCES professionals(id)
        ON DELETE RESTRICT;

    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'profiles'
    )
    AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'service_requests_client_fk'
    ) THEN

        ALTER TABLE service_requests
        ADD CONSTRAINT service_requests_client_fk
        FOREIGN KEY (client_id)
        REFERENCES profiles(id)
        ON DELETE RESTRICT;

    END IF;

END
$$;

-- ============================================================
-- 5. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS
    professionals_category_idx
ON professionals(category);

CREATE INDEX IF NOT EXISTS
    professionals_location_idx
ON professionals(location);

CREATE INDEX IF NOT EXISTS
    professionals_active_idx
ON professionals(is_active)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS
    services_professional_idx
ON services(professional_id);

CREATE INDEX IF NOT EXISTS
    services_category_idx
ON services(category);

CREATE INDEX IF NOT EXISTS
    services_active_idx
ON services(is_active)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS
    services_featured_idx
ON services(is_featured)
WHERE is_featured = TRUE;

CREATE INDEX IF NOT EXISTS
    service_requests_client_idx
ON service_requests(client_id);

CREATE INDEX IF NOT EXISTS
    service_requests_professional_idx
ON service_requests(professional_id);

CREATE INDEX IF NOT EXISTS
    service_requests_status_idx
ON service_requests(status);

CREATE INDEX IF NOT EXISTS
    service_requests_schedule_idx
ON service_requests(requested_start_at);

-- ============================================================
-- 6. RLS
-- ============================================================

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professionals_public_read
ON professionals;

CREATE POLICY professionals_public_read
ON professionals
FOR SELECT
TO anon, authenticated
USING (
    is_active = TRUE
);

DROP POLICY IF EXISTS services_public_read
ON services;

CREATE POLICY services_public_read
ON services
FOR SELECT
TO anon, authenticated
USING (
    is_active = TRUE
);

DROP POLICY IF EXISTS service_requests_client_select
ON service_requests;

CREATE POLICY service_requests_client_select
ON service_requests
FOR SELECT
TO authenticated
USING (
    client_id = auth.uid()
);

DROP POLICY IF EXISTS service_requests_professional_select
ON service_requests;

CREATE POLICY service_requests_professional_select
ON service_requests
FOR SELECT
TO authenticated
USING (
    professional_id IN (
        SELECT id
        FROM professionals
        WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS service_requests_client_insert
ON service_requests;

CREATE POLICY service_requests_client_insert
ON service_requests
FOR INSERT
TO authenticated
WITH CHECK (
    client_id = auth.uid()
);

-- ============================================================
-- 7. UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
    professionals_updated_at
ON professionals;

CREATE TRIGGER
    professionals_updated_at
BEFORE UPDATE ON professionals
FOR EACH ROW
EXECUTE FUNCTION update_services_updated_at();

DROP TRIGGER IF EXISTS
    services_updated_at
ON services;

CREATE TRIGGER
    services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION update_services_updated_at();

DROP TRIGGER IF EXISTS
    service_requests_updated_at
ON service_requests;

CREATE TRIGGER
    service_requests_updated_at
BEFORE UPDATE ON service_requests
FOR EACH ROW
EXECUTE FUNCTION update_services_updated_at();

COMMIT;

-- ============================================================
-- FIN 023_services.sql
-- ============================================================
```
