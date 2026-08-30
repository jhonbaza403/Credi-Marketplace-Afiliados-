-- ============================================================
-- 016_audit.sql
-- Credi Marketplace
-- Sistema centralizado de auditoría
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_user_id uuid NULL,

  action text NOT NULL,
  resource_type text NULL,
  resource_id text NULL,

  request_id text NULL,

  ip_address inet NULL,
  user_agent text NULL,

  old_data jsonb NULL,
  new_data jsonb NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  success boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT audit_logs_action_check
    CHECK (length(trim(action)) BETWEEN 2 AND 100)
);

-- ============================================================
-- Índices
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON public.audit_logs(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON public.audit_logs(resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_request
  ON public.audit_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON public.audit_logs(created_at DESC);

-- ============================================================
-- Función de auditoría
-- ============================================================

CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT auth.uid(),
  p_request_id text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_success boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  audit_id uuid;
BEGIN

  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    request_id,
    ip_address,
    user_agent,
    old_data,
    new_data,
    metadata,
    success
  )
  VALUES (
    p_actor_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_request_id,
    p_ip_address,
    p_user_agent,
    p_old_data,
    p_new_data,
    COALESCE(p_metadata, '{}'::jsonb),
    p_success
  )
  RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- El usuario no puede leer auditoría directamente.
-- La administración se realizará mediante funciones/políticas
-- específicas cuando corresponda.

DROP POLICY IF EXISTS audit_logs_no_direct_select
ON public.audit_logs;

CREATE POLICY audit_logs_no_direct_select
ON public.audit_logs
FOR SELECT
TO authenticated
USING (false);

-- Evitamos INSERT directo desde el cliente.
DROP POLICY IF EXISTS audit_logs_no_direct_insert
ON public.audit_logs;

CREATE POLICY audit_logs_no_direct_insert
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Nunca permitir UPDATE/DELETE desde clientes.

DROP POLICY IF EXISTS audit_logs_no_update
ON public.audit_logs;

CREATE POLICY audit_logs_no_update
ON public.audit_logs
FOR UPDATE
TO authenticated
USING (false);

DROP POLICY IF EXISTS audit_logs_no_delete
ON public.audit_logs;

CREATE POLICY audit_logs_no_delete
ON public.audit_logs
FOR DELETE
TO authenticated
USING (false);

REVOKE ALL
ON public.audit_logs
FROM anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.write_audit_log(
  text,
  text,
  text,
  uuid,
  text,
  inet,
  text,
  jsonb,
  jsonb,
  jsonb,
  boolean
)
TO authenticated;

COMMIT;