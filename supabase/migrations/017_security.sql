-- ============================================================
-- 017_security.sql
-- Credi Marketplace
-- Hardening de seguridad PostgreSQL / Supabase
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Esquema público
-- ============================================================

REVOKE CREATE
ON SCHEMA public
FROM PUBLIC;

GRANT USAGE
ON SCHEMA public
TO anon, authenticated;

-- ============================================================
-- 2. No exponer tablas sensibles
-- ============================================================

DO $$
DECLARE
  table_name text;
BEGIN

  FOREACH table_name IN ARRAY ARRAY[
    'audit_logs',
    'idempotency_keys',
    'webhook_events',
    'payment_intents',
    'affiliate_commissions',
    'affiliate_payouts'
  ]
  LOOP

    IF to_regclass('public.' || table_name) IS NOT NULL THEN

      REVOKE ALL
      ON TABLE public.audit_logs
      FROM anon, authenticated;

      IF table_name <> 'audit_logs' THEN
        EXECUTE format(
          'REVOKE ALL ON TABLE public.%I FROM anon, authenticated',
          table_name
        );
      END IF;

    END IF;

  END LOOP;
END;
$$;

-- ============================================================
-- 3. Protección de funciones SECURITY DEFINER
-- ============================================================

DO $$
DECLARE
  function_record record;
BEGIN

  FOR function_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS arguments
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP

    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC',
      function_record.schema_name,
      function_record.function_name,
      function_record.arguments
    );

  END LOOP;

END;
$$;

-- ============================================================
-- 4. Prevenir search_path inseguro
-- ============================================================

DO $$
DECLARE
  function_record record;
BEGIN

  FOR function_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS arguments
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP

    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s)
       SET search_path = public',
      function_record.schema_name,
      function_record.function_name,
      function_record.arguments
    );

  END LOOP;

END;
$$;

-- ============================================================
-- 5. Función para comprobar rol
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(
  requested_role text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = requested_role
      AND is_active = true
  );
$$;

REVOKE ALL
ON FUNCTION public.has_role(text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.has_role(text)
TO authenticated;

-- ============================================================
-- 6. Función administrativa
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.has_role('admin');
$$;

REVOKE ALL
ON FUNCTION public.is_admin()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_admin()
TO authenticated;

COMMIT;