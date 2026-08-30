-- ============================================================
-- CREDI MARKETPLACE
-- MIGRATION 020
-- Affiliate Tracking & Attribution
-- ============================================================
--
-- OBJETIVO
-- -------
-- Sistema de tracking y atribución de afiliados.
--
-- CAPACIDADES
-- -----------
-- • Click tracking
-- • Sesiones de atribución
-- • affiliate_ref
-- • Producto
-- • Usuario
-- • IP hasheada
-- • User-Agent
-- • Timestamp
-- • Conversión
-- • order_id
-- • Comisión
-- • Protección contra auto-referidos
-- • Modelos de atribución
-- • Expiración de atribución
-- • Integridad referencial
-- • Índices de alto rendimiento
-- • RLS
--
-- DEPENDENCIAS
-- ------------
-- 002_core_schema.sql
-- 003_orders.sql
-- 004_order_items.sql
-- 007_affiliates.sql
--
-- ============================================================

BEGIN;

-- ============================================================
-- 1. EXTENSIONES / FUNCIONES AUXILIARES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. ENUM: MODELO DE ATRIBUCIÓN
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'affiliate_attribution_model'
    ) THEN

        CREATE TYPE affiliate_attribution_model AS ENUM (
            'last_click',
            'first_click',
            'last_non_direct_click'
        );

    END IF;
END
$$;

-- ============================================================
-- 3. ENUM: ESTADO DEL TRACKING
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'affiliate_tracking_status'
    ) THEN

        CREATE TYPE affiliate_tracking_status AS ENUM (
            'active',
            'converted',
            'expired',
            'invalidated'
        );

    END IF;
END
$$;

-- ============================================================
-- 4. CONFIGURACIÓN DE ATRIBUCIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_tracking_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    attribution_model affiliate_attribution_model
        NOT NULL DEFAULT 'last_click',

    attribution_window_hours INTEGER
        NOT NULL DEFAULT 720,

    enabled BOOLEAN
        NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT affiliate_tracking_window_positive
        CHECK (
            attribution_window_hours > 0
            AND attribution_window_hours <= 8760
        )
);

-- ============================================================
-- 5. SESIONES DE ATRIBUCIÓN
-- ============================================================
--
-- Representa una ventana de atribución originada por
-- una interacción con un enlace de afiliado.
--
-- NO almacena la IP original.
-- Se almacena únicamente un hash irreversible.
--

CREATE TABLE IF NOT EXISTS affiliate_tracking_sessions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    affiliate_id UUID NOT NULL,

    affiliate_ref VARCHAR(128) NOT NULL,

    user_id UUID NULL,

    session_id UUID NULL,

    product_id UUID NULL,

    landing_path TEXT NULL,

    referrer_url TEXT NULL,

    ip_hash TEXT NULL,

    user_agent TEXT NULL,

    status affiliate_tracking_status
        NOT NULL DEFAULT 'active',

    attribution_model affiliate_attribution_model
        NOT NULL DEFAULT 'last_click',

    clicked_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ
        NOT NULL,

    converted_at TIMESTAMPTZ NULL,

    converted_order_id UUID NULL,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT affiliate_tracking_sessions_ref_length
        CHECK (
            char_length(affiliate_ref)
            BETWEEN 1 AND 128
        ),

    CONSTRAINT affiliate_tracking_sessions_expiration
        CHECK (
            expires_at > clicked_at
        )
);

-- ============================================================
-- 6. CLICKS
-- ============================================================
--
-- Un click representa una interacción concreta.
--
-- Una sesión puede contener múltiples clicks.
--

CREATE TABLE IF NOT EXISTS affiliate_clicks (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    affiliate_id UUID NOT NULL,

    affiliate_ref VARCHAR(128) NOT NULL,

    tracking_session_id UUID NULL,

    user_id UUID NULL,

    product_id UUID NULL,

    session_id UUID NULL,

    ip_hash TEXT NULL,

    user_agent TEXT NULL,

    landing_path TEXT NULL,

    referrer_url TEXT NULL,

    clicked_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT affiliate_clicks_ref_length
        CHECK (
            char_length(affiliate_ref)
            BETWEEN 1 AND 128
        )
);

-- ============================================================
-- 7. CONVERSIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_conversions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    affiliate_id UUID NOT NULL,

    affiliate_ref VARCHAR(128) NOT NULL,

    tracking_session_id UUID NULL,

    user_id UUID NULL,

    order_id UUID NOT NULL,

    product_id UUID NULL,

    attribution_model affiliate_attribution_model
        NOT NULL DEFAULT 'last_click',

    order_amount NUMERIC(18,2)
        NOT NULL DEFAULT 0,

    commission_rate NUMERIC(8,5)
        NOT NULL DEFAULT 0,

    commission_amount NUMERIC(18,2)
        NOT NULL DEFAULT 0,

    status VARCHAR(32)
        NOT NULL DEFAULT 'pending',

    attributed_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    approved_at TIMESTAMPTZ NULL,

    paid_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    CONSTRAINT affiliate_conversion_order_amount_valid
        CHECK (order_amount >= 0),

    CONSTRAINT affiliate_conversion_rate_valid
        CHECK (
            commission_rate >= 0
            AND commission_rate <= 1
        ),

    CONSTRAINT affiliate_conversion_amount_valid
        CHECK (commission_amount >= 0),

    CONSTRAINT affiliate_conversion_status_valid
        CHECK (
            status IN (
                'pending',
                'approved',
                'rejected',
                'paid',
                'cancelled'
            )
        )
);

-- ============================================================
-- 8. FOREIGN KEYS
-- ============================================================

DO $$
BEGIN

    -- --------------------------------------------------------
    -- affiliate_tracking_sessions → affiliates
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'affiliate_tracking_sessions_affiliate_fk'
    ) THEN

        ALTER TABLE affiliate_tracking_sessions
        ADD CONSTRAINT
            affiliate_tracking_sessions_affiliate_fk
        FOREIGN KEY (affiliate_id)
        REFERENCES affiliates(id)
        ON DELETE RESTRICT;

    END IF;


    -- --------------------------------------------------------
    -- affiliate_clicks → affiliates
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'affiliate_clicks_affiliate_fk'
    ) THEN

        ALTER TABLE affiliate_clicks
        ADD CONSTRAINT
            affiliate_clicks_affiliate_fk
        FOREIGN KEY (affiliate_id)
        REFERENCES affiliates(id)
        ON DELETE RESTRICT;

    END IF;


    -- --------------------------------------------------------
    -- affiliate_conversions → affiliates
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'affiliate_conversions_affiliate_fk'
    ) THEN

        ALTER TABLE affiliate_conversions
        ADD CONSTRAINT
            affiliate_conversions_affiliate_fk
        FOREIGN KEY (affiliate_id)
        REFERENCES affiliates(id)
        ON DELETE RESTRICT;

    END IF;

END
$$;

-- ============================================================
-- 9. RELACIONES OPCIONALES
-- ============================================================

DO $$
BEGIN

    -- sessions → profiles
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'profiles'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'affiliate_tracking_sessions_user_fk'
    ) THEN

        ALTER TABLE affiliate_tracking_sessions
        ADD CONSTRAINT
            affiliate_tracking_sessions_user_fk
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE SET NULL;

    END IF;


    -- sessions → products
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'products'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'affiliate_tracking_sessions_product_fk'
    ) THEN

        ALTER TABLE affiliate_tracking_sessions
        ADD CONSTRAINT
            affiliate_tracking_sessions_product_fk
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE SET NULL;

    END IF;


    -- sessions → orders
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'orders'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'affiliate_tracking_sessions_order_fk'
    ) THEN

        ALTER TABLE affiliate_tracking_sessions
        ADD CONSTRAINT
            affiliate_tracking_sessions_order_fk
        FOREIGN KEY (converted_order_id)
        REFERENCES orders(id)
        ON DELETE SET NULL;

    END IF;


    -- clicks → products
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'products'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'affiliate_clicks_product_fk'
    ) THEN

        ALTER TABLE affiliate_clicks
        ADD CONSTRAINT
            affiliate_clicks_product_fk
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE SET NULL;

    END IF;


    -- conversions → orders
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'orders'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'affiliate_conversions_order_fk'
    ) THEN

        ALTER TABLE affiliate_conversions
        ADD CONSTRAINT
            affiliate_conversions_order_fk
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE RESTRICT;

    END IF;


    -- conversions → profiles
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'profiles'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'affiliate_conversions_user_fk'
    ) THEN

        ALTER TABLE affiliate_conversions
        ADD CONSTRAINT
            affiliate_conversions_user_fk
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE SET NULL;

    END IF;


    -- conversions → products
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'products'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'affiliate_conversions_product_fk'
    ) THEN

        ALTER TABLE affiliate_conversions
        ADD CONSTRAINT
            affiliate_conversions_product_fk
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE SET NULL;

    END IF;

END
$$;

-- ============================================================
-- 10. PROTECCIÓN CONTRA AUTOREFERIDOS
-- ============================================================
--
-- Un afiliado no puede generar comisión sobre su propia compra.
--
-- Esta función será utilizada también por las funciones
-- de atribución y checkout.
--

CREATE OR REPLACE FUNCTION prevent_affiliate_self_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affiliate_owner UUID;
BEGIN

    SELECT user_id
    INTO affiliate_owner
    FROM affiliates
    WHERE id = NEW.affiliate_id;

    IF affiliate_owner IS NOT NULL
       AND NEW.user_id IS NOT NULL
       AND affiliate_owner = NEW.user_id
    THEN

        RAISE EXCEPTION
            'affiliate_self_referral'
            USING ERRCODE = 'P0001';

    END IF;

    RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS
    prevent_affiliate_self_referral_trigger
ON affiliate_conversions;

CREATE TRIGGER
    prevent_affiliate_self_referral_trigger
BEFORE INSERT OR UPDATE
ON affiliate_conversions
FOR EACH ROW
EXECUTE FUNCTION prevent_affiliate_self_referral();

-- ============================================================
-- 11. PROTECCIÓN CONTRA CONVERSIONES DUPLICADAS
-- ============================================================
--
-- Una misma orden solamente puede producir una conversión
-- atribuida una vez.
--

CREATE UNIQUE INDEX IF NOT EXISTS
    affiliate_conversions_order_unique_idx
ON affiliate_conversions(order_id);

-- ============================================================
-- 12. PROTECCIÓN CONTRA SESIONES DUPLICADAS
-- ============================================================

CREATE INDEX IF NOT EXISTS
    affiliate_tracking_sessions_session_idx
ON affiliate_tracking_sessions(session_id);

CREATE INDEX IF NOT EXISTS
    affiliate_tracking_sessions_ref_idx
ON affiliate_tracking_sessions(affiliate_ref);

-- ============================================================
-- 13. ÍNDICES DE CLICKS
-- ============================================================

CREATE INDEX IF NOT EXISTS
    affiliate_clicks_affiliate_idx
ON affiliate_clicks(affiliate_id);

CREATE INDEX IF NOT EXISTS
    affiliate_clicks_ref_idx
ON affiliate_clicks(affiliate_ref);

CREATE INDEX IF NOT EXISTS
    affiliate_clicks_session_idx
ON affiliate_clicks(tracking_session_id);

CREATE INDEX IF NOT EXISTS
    affiliate_clicks_user_idx
ON affiliate_clicks(user_id);

CREATE INDEX IF NOT EXISTS
    affiliate_clicks_product_idx
ON affiliate_clicks(product_id);

CREATE INDEX IF NOT EXISTS
    affiliate_clicks_created_idx
ON affiliate_clicks(clicked_at DESC);

-- ============================================================
-- 14. ÍNDICES DE CONVERSIONES
-- ============================================================

CREATE INDEX IF NOT EXISTS
    affiliate_conversions_affiliate_idx
ON affiliate_conversions(affiliate_id);

CREATE INDEX IF NOT EXISTS
    affiliate_conversions_user_idx
ON affiliate_conversions(user_id);

CREATE INDEX IF NOT EXISTS
    affiliate_conversions_order_idx
ON affiliate_conversions(order_id);

CREATE INDEX IF NOT EXISTS
    affiliate_conversions_status_idx
ON affiliate_conversions(status);

CREATE INDEX IF NOT EXISTS
    affiliate_conversions_created_idx
ON affiliate_conversions(created_at DESC);

-- ============================================================
-- 15. EXPIRACIÓN
-- ============================================================

CREATE INDEX IF NOT EXISTS
    affiliate_tracking_sessions_expiration_idx
ON affiliate_tracking_sessions(expires_at)
WHERE status = 'active';

-- ============================================================
-- 16. FUNCIÓN PARA EXPIRAR ATRIBUCIONES
-- ============================================================

CREATE OR REPLACE FUNCTION expire_affiliate_tracking_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected_rows INTEGER;
BEGIN

    UPDATE affiliate_tracking_sessions
    SET
        status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
      AND expires_at <= NOW();

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    RETURN affected_rows;

END;
$$;

-- ============================================================
-- 17. ACTUALIZACIÓN AUTOMÁTICA DE updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_affiliate_tracking_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS
    affiliate_tracking_sessions_updated_at
ON affiliate_tracking_sessions;

CREATE TRIGGER
    affiliate_tracking_sessions_updated_at
BEFORE UPDATE
ON affiliate_tracking_sessions
FOR EACH ROW
EXECUTE FUNCTION update_affiliate_tracking_updated_at();


DROP TRIGGER IF EXISTS
    affiliate_conversions_updated_at
ON affiliate_conversions;

CREATE TRIGGER
    affiliate_conversions_updated_at
BEFORE UPDATE
ON affiliate_conversions
FOR EACH ROW
EXECUTE FUNCTION update_affiliate_tracking_updated_at();

-- ============================================================
-- 18. RLS
-- ============================================================

ALTER TABLE affiliate_tracking_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;

ALTER TABLE affiliate_tracking_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 19. POLÍTICAS
-- ============================================================
--
-- El tracking no debe ser modificable libremente por usuarios.
-- La creación debe pasar por funciones/API controladas.
--

DROP POLICY IF EXISTS
    affiliate_tracking_sessions_select_own
ON affiliate_tracking_sessions;

CREATE POLICY
    affiliate_tracking_sessions_select_own
ON affiliate_tracking_sessions
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS
    affiliate_conversions_select_own
ON affiliate_conversions;

CREATE POLICY
    affiliate_conversions_select_own
ON affiliate_conversions
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- Los clicks quedan protegidos.
-- No se concede INSERT/UPDATE/DELETE directo al cliente.

-- ============================================================
-- 20. PERMISOS
-- ============================================================

REVOKE ALL
ON affiliate_tracking_sessions
FROM anon, authenticated;

REVOKE ALL
ON affiliate_clicks
FROM anon, authenticated;

REVOKE ALL
ON affiliate_conversions
FROM anon, authenticated;

REVOKE ALL
ON affiliate_tracking_config
FROM anon, authenticated;

-- Las funciones SECURITY DEFINER serán utilizadas por
-- las capas de aplicación controladas.

-- ============================================================
-- 21. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================

COMMENT ON TABLE affiliate_tracking_sessions IS
'Sesiones de atribución de afiliados y ventanas temporales de conversión.';

COMMENT ON TABLE affiliate_clicks IS
'Registro técnico de interacciones con enlaces de afiliados.';

COMMENT ON TABLE affiliate_conversions IS
'Conversiones comerciales atribuidas a afiliados.';

COMMENT ON COLUMN affiliate_tracking_sessions.ip_hash IS
'Hash irreversible de IP; nunca almacena la IP original.';

COMMENT ON COLUMN affiliate_clicks.ip_hash IS
'Hash irreversible de IP utilizado para análisis y protección antifraude.';

COMMENT ON COLUMN affiliate_tracking_sessions.expires_at IS
'Fecha límite de validez de la atribución.';

COMMENT ON COLUMN affiliate_conversions.commission_amount IS
'Comisión monetaria calculada para la conversión atribuida.';

-- ============================================================
-- 22. CONFIGURACIÓN INICIAL
-- ============================================================

INSERT INTO affiliate_tracking_config (
    attribution_model,
    attribution_window_hours,
    enabled
)
SELECT
    'last_click',
    720,
    TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM affiliate_tracking_config
);

COMMIT;

-- ============================================================
-- FIN 020_affiliate_tracking.sql
-- ============================================================