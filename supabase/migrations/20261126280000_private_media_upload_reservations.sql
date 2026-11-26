BEGIN;

CREATE TABLE IF NOT EXISTS private.media_upload_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_path text NOT NULL,
  final_path text,
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  mime_type text NOT NULL,
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','completed','released','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  completed_at timestamptz,
  UNIQUE (user_id, source_path)
);

CREATE INDEX IF NOT EXISTS media_upload_reservations_user_status_idx
ON private.media_upload_reservations(user_id,status,expires_at);

REVOKE ALL ON TABLE private.media_upload_reservations FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.reserve_private_chat_media_upload(
  p_user_id uuid,
  p_source_path text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_size bigint;
  v_mime text;
  v_max bigint;
  v_limit_mb numeric;
  v_used_bytes bigint;
  v_reserved_bytes bigint;
  v_existing private.media_upload_reservations%ROWTYPE;
  v_reservation_id uuid;
BEGIN
  IF p_user_id IS NULL
     OR p_source_path IS NULL
     OR p_source_path !~ ('^'||p_user_id::text||'/[^/]+$') THEN
    RAISE EXCEPTION 'PRIVATE_MEDIA_SOURCE_PATH_INVALID' USING ERRCODE='42501';
  END IF;

  SELECT
    CASE WHEN coalesce(o.metadata->>'size','') ~ '^[0-9]+$'
      THEN (o.metadata->>'size')::bigint ELSE NULL END,
    lower(coalesce(o.metadata->>'mimetype',o.metadata->>'mime_type',''))
  INTO v_size,v_mime
  FROM storage.objects o
  WHERE o.bucket_id='media-upload-staging'
    AND o.name=p_source_path
  LIMIT 1;

  IF v_size IS NULL OR v_size <= 0 THEN
    RAISE EXCEPTION 'STAGED_MEDIA_SIZE_INVALID' USING ERRCODE='23514';
  END IF;

  IF v_mime IN ('image/jpeg','image/png','image/webp','image/gif') THEN
    v_max := 20 * 1024 * 1024;
  ELSIF v_mime IN ('video/mp4','video/webm','video/quicktime') THEN
    v_max := 500 * 1024 * 1024;
  ELSIF v_mime IN ('audio/aac','audio/flac','audio/m4a','audio/mp4','audio/mpeg','audio/ogg','audio/opus','audio/webm','audio/wav','audio/x-m4a','audio/x-wav') THEN
    v_max := 50 * 1024 * 1024;
  ELSIF v_mime IN (
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','text/csv'
  ) THEN
    v_max := 100 * 1024 * 1024;
  ELSE
    RAISE EXCEPTION 'MEDIA_UPLOAD_MIME_NOT_ALLOWED' USING ERRCODE='23514';
  END IF;

  IF v_size > v_max THEN
    RAISE EXCEPTION 'MEDIA_UPLOAD_FILE_TOO_LARGE' USING ERRCODE='23514';
  END IF;

  PERFORM 1 FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRIVATE_MEDIA_USER_NOT_FOUND' USING ERRCODE='23503';
  END IF;

  UPDATE private.media_upload_reservations
  SET status='expired'
  WHERE user_id=p_user_id AND status='reserved' AND expires_at<=now();

  SELECT * INTO v_existing
  FROM private.media_upload_reservations
  WHERE user_id=p_user_id AND source_path=p_source_path
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.status='completed' THEN
      RETURN v_existing.id;
    END IF;
    IF v_existing.status='reserved' AND v_existing.expires_at>now() THEN
      IF v_existing.byte_size<>v_size OR v_existing.mime_type<>v_mime THEN
        RAISE EXCEPTION 'STAGED_MEDIA_METADATA_CHANGED' USING ERRCODE='23514';
      END IF;
      RETURN v_existing.id;
    END IF;
  END IF;

  SELECT nullif(p.limits->>'storage_mb','')::numeric
    INTO v_limit_mb
  FROM public.subscriptions s
  JOIN public.plans p ON p.id=s.plan_id
  WHERE s.user_id=p_user_id
    AND s.status IN ('active','trialing','past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_limit_mb IS NULL OR v_limit_mb<=0 THEN
    SELECT nullif(limits->>'storage_mb','')::numeric
      INTO v_limit_mb
    FROM public.plans
    WHERE code='free' AND is_active=true
    LIMIT 1;
  END IF;
  v_limit_mb := coalesce(nullif(v_limit_mb,0),250);

  IF EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='credichat-private'
      AND o.name LIKE p_user_id::text||'/%'
      AND coalesce(o.metadata->>'size','') !~ '^[0-9]+$'
  ) THEN
    RAISE EXCEPTION 'PRIVATE_MEDIA_EXISTING_SIZE_METADATA_INVALID' USING ERRCODE='23514';
  END IF;

  SELECT coalesce(sum((o.metadata->>'size')::bigint),0)
    INTO v_used_bytes
  FROM storage.objects o
  WHERE o.bucket_id='credichat-private'
    AND o.name LIKE p_user_id::text||'/%';

  SELECT coalesce(sum(r.byte_size),0)
    INTO v_reserved_bytes
  FROM private.media_upload_reservations r
  WHERE r.user_id=p_user_id
    AND r.status='reserved'
    AND r.expires_at>now()
    AND r.source_path<>p_source_path;

  IF v_used_bytes+v_reserved_bytes+v_size > floor(v_limit_mb*1024*1024)::bigint THEN
    RAISE EXCEPTION 'PLAN_STORAGE_LIMIT_REACHED' USING ERRCODE='23514';
  END IF;

  IF FOUND THEN
    UPDATE private.media_upload_reservations
    SET byte_size=v_size,mime_type=v_mime,status='reserved',
        final_path=NULL,created_at=now(),expires_at=now()+interval '30 minutes',
        completed_at=NULL
    WHERE id=v_existing.id
    RETURNING id INTO v_reservation_id;
  ELSE
    INSERT INTO private.media_upload_reservations(user_id,source_path,byte_size,mime_type)
    VALUES(p_user_id,p_source_path,v_size,v_mime)
    RETURNING id INTO v_reservation_id;
  END IF;

  RETURN v_reservation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION private.complete_private_chat_media_upload(
  p_reservation_id uuid,
  p_final_path text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  r private.media_upload_reservations%ROWTYPE;
  v_size bigint;
  v_mime text;
BEGIN
  SELECT * INTO r
  FROM private.media_upload_reservations
  WHERE id=p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'MEDIA_UPLOAD_RESERVATION_NOT_FOUND'; END IF;
  IF r.status='completed' AND r.final_path=p_final_path THEN RETURN true; END IF;
  IF r.status<>'reserved' OR r.expires_at<=now() THEN
    RAISE EXCEPTION 'MEDIA_UPLOAD_RESERVATION_EXPIRED';
  END IF;
  IF p_final_path !~ ('^'||r.user_id::text||'/[^/]+$') THEN
    RAISE EXCEPTION 'PRIVATE_MEDIA_FINAL_PATH_INVALID' USING ERRCODE='42501';
  END IF;

  SELECT
    CASE WHEN coalesce(o.metadata->>'size','') ~ '^[0-9]+$'
      THEN (o.metadata->>'size')::bigint ELSE NULL END,
    lower(coalesce(o.metadata->>'mimetype',o.metadata->>'mime_type',''))
  INTO v_size,v_mime
  FROM storage.objects o
  WHERE o.bucket_id='credichat-private' AND o.name=p_final_path
  LIMIT 1;

  IF v_size IS NULL OR v_size<>r.byte_size OR v_mime<>r.mime_type THEN
    RAISE EXCEPTION 'FINAL_MEDIA_METADATA_MISMATCH' USING ERRCODE='23514';
  END IF;

  UPDATE private.media_upload_reservations
  SET status='completed',final_path=p_final_path,completed_at=now(),expires_at=now()
  WHERE id=p_reservation_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION private.release_private_chat_media_upload(p_reservation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE private.media_upload_reservations
  SET status='released',expires_at=now()
  WHERE id=p_reservation_id AND status='reserved';
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION private.reserve_private_chat_media_upload(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.complete_private_chat_media_upload(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.release_private_chat_media_upload(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.reserve_private_chat_media_upload(p_user_id uuid,p_source_path text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private.reserve_private_chat_media_upload($1,$2);
$function$;

CREATE OR REPLACE FUNCTION public.complete_private_chat_media_upload(p_reservation_id uuid,p_final_path text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private.complete_private_chat_media_upload($1,$2);
$function$;

CREATE OR REPLACE FUNCTION public.release_private_chat_media_upload(p_reservation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private.release_private_chat_media_upload($1);
$function$;

REVOKE ALL ON FUNCTION public.reserve_private_chat_media_upload(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.complete_private_chat_media_upload(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.release_private_chat_media_upload(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_private_chat_media_upload(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_private_chat_media_upload(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_private_chat_media_upload(uuid) TO service_role;

DO $contract$
BEGIN
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.reserve_private_chat_media_upload(uuid,text)'::regprocedure)
     OR NOT (SELECT coalesce(proconfig,ARRAY[]::text[]) @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='public.reserve_private_chat_media_upload(uuid,text)'::regprocedure)
     OR NOT has_function_privilege('service_role','public.reserve_private_chat_media_upload(uuid,text)','EXECUTE')
     OR has_function_privilege('authenticated','public.reserve_private_chat_media_upload(uuid,text)','EXECUTE')
     OR has_function_privilege('anon','public.reserve_private_chat_media_upload(uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'PRIVATE_MEDIA_RESERVATION_RPC_CONTRACT_FAILED';
  END IF;
END;
$contract$;

COMMIT;