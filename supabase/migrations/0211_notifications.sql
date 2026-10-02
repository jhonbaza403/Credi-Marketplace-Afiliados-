```sql
-- ============================================================
-- CREDI MARKETPLACE
-- MIGRATION 021
-- NOTIFICATIONS
-- ============================================================
--
-- Sistema centralizado de notificaciones.
--
-- Soporta:
-- • órdenes
-- • pagos
-- • afiliados
-- • B2B
-- • empleos
-- • servicios
-- • seguridad
-- • sistema
-- • lectura/no lectura
-- • deduplicación
-- • preferencias
--
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. TIPOS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'notification_type'
    ) THEN
        CREATE TYPE notification_type AS ENUM (
            'order',
            'payment',
            'affiliate',
            'b2b',
            'job',
            'service',
            'security',
            'system'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'notification_priority'
    ) THEN
        CREATE TYPE notification_priority AS ENUM (
            'low',
            'normal',
            'high',
            'critical'
        );
    END IF;
END
$$;

-- ============================================================
-- 2. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    type notification_type NOT NULL,

    priority notification_priority
        NOT NULL DEFAULT 'normal',

    title VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    action_url TEXT NULL,

    entity_type VARCHAR(80) NULL,

    entity_id UUID NULL,

    metadata JSONB
        NOT NULL DEFAULT '{}'::jsonb,

    read_at TIMESTAMPTZ NULL,

    expires_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT notifications_title_not_empty
        CHECK (char_length(trim(title)) > 0),

    CONSTRAINT notifications_message_not_empty
        CHECK (char_length(trim(message)) > 0)
);

-- ============================================================
-- 3. PREFERENCIAS
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (

    user_id UUID PRIMARY KEY,

    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    order_notifications BOOLEAN NOT NULL DEFAULT TRUE,

    payment_notifications BOOLEAN NOT NULL DEFAULT TRUE,

    affiliate_notifications BOOLEAN NOT NULL DEFAULT TRUE,

    b2b_notifications BOOLEAN NOT NULL DEFAULT TRUE,

    job_notifications BOOLEAN NOT NULL DEFAULT TRUE,

    service_notifications BOOLEAN NOT NULL DEFAULT TRUE,

    security_notifications BOOLEAN NOT NULL DEFAULT TRUE,

    marketing_notifications BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. ENTREGA DE NOTIFICACIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_deliveries (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    notification_id UUID NOT NULL,

    channel VARCHAR(32) NOT NULL,

    status VARCHAR(32)
        NOT NULL DEFAULT 'pending',

    provider_message_id TEXT NULL,

    attempt_count INTEGER
        NOT NULL DEFAULT 0,

    last_error TEXT NULL,

    sent_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT notification_delivery_channel_valid
        CHECK (
            channel IN (
                'in_app',
                'email',
                'push'
            )
        ),

    CONSTRAINT notification_delivery_status_valid
        CHECK (
            status IN (
                'pending',
                'processing',
                'sent',
                'failed',
                'cancelled'
            )
        ),

    CONSTRAINT notification_delivery_attempts_valid
        CHECK (attempt_count >= 0)
);

-- ============================================================
-- 5. FOREIGN KEYS
-- ============================================================

DO $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'profiles'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notifications_user_fk'
    ) THEN

        ALTER TABLE notifications
        ADD CONSTRAINT notifications_user_fk
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;

    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notification_deliveries_notification_fk'
    ) THEN

        ALTER TABLE notification_deliveries
        ADD CONSTRAINT notification_deliveries_notification_fk
        FOREIGN KEY (notification_id)
        REFERENCES notifications(id)
        ON DELETE CASCADE;

    END IF;

END
$$;

-- ============================================================
-- 6. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS
    notifications_user_created_idx
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS
    notifications_unread_idx
ON notifications(user_id, created_at DESC)
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS
    notifications_type_idx
ON notifications(type);

CREATE INDEX IF NOT EXISTS
    notifications_entity_idx
ON notifications(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS
    notification_deliveries_status_idx
ON notification_deliveries(status);

CREATE UNIQUE INDEX IF NOT EXISTS
    notification_delivery_unique_channel
ON notification_deliveries(notification_id, channel);

-- ============================================================
-- 7. RLS
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own
ON notifications;

CREATE POLICY notifications_select_own
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS notification_preferences_own
ON notification_preferences;

CREATE POLICY notification_preferences_own
ON notification_preferences
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE
ON notifications
FROM anon, authenticated;

REVOKE ALL
ON notification_deliveries
FROM anon, authenticated;

-- ============================================================
-- 8. UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
    notifications_updated_at_trigger
ON notifications;

CREATE TRIGGER
    notifications_updated_at_trigger
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_notifications_updated_at();

DROP TRIGGER IF EXISTS
    notification_preferences_updated_at_trigger
ON notification_preferences;

CREATE TRIGGER
    notification_preferences_updated_at_trigger
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notifications_updated_at();

COMMIT;

-- ============================================================
-- FIN 021_notifications.sql
-- ============================================================
```
