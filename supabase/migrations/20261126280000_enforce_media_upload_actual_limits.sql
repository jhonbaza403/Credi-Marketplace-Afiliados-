BEGIN;

-- Align the private chat bucket with the MIME types accepted by the shared
-- upload policy. Additive only: abort if the bucket has unexpected settings.
DO $bucket$
DECLARE
  expected text[] := ARRAY[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime',
    'audio/aac','audio/flac','audio/m4a','audio/mp4','audio/mpeg',
    'audio/ogg','audio/opus','audio/webm','audio/wav','audio/x-m4a','audio/x-wav',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','text/csv'
  ];
  current_types text[];
BEGIN
  SELECT allowed_mime_types INTO current_types
  FROM storage.buckets
  WHERE id='credichat-private' AND public=false AND file_size_limit=524288000
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRIVATE_CHAT_BUCKET_CONFIGURATION_MISMATCH';
  END IF;
  IF current_types IS NULL OR NOT (current_types <@ expected) THEN
    RAISE EXCEPTION 'PRIVATE_CHAT_BUCKET_HAS_UNEXPECTED_MIME_TYPES';
  END IF;
  UPDATE storage.buckets
  SET allowed_mime_types=expected
  WHERE id='credichat-private';
END;
$bucket$;

CREATE OR REPLACE FUNCTION private.enforce_media_upload_actual_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_size bigint;
  v_mime text;
  v_max_bytes bigint;
  v_user_id uuid;
  v_limit_mb numeric;
  v_used_bytes bigint;
BEGIN
  IF NEW.bucket_id NOT IN ('marketplace-media','credichat-private') THEN
    RETURN NEW;
  END IF;

  IF coalesce(NEW.metadata->>'size','') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'MEDIA_UPLOAD_SIZE_METADATA_INVALID' USING ERRCODE='23514';
  END IF;
  v_size := (NEW.metadata->>'size')::bigint;
  v_mime := lower(coalesce(NEW.metadata->>'mimetype',NEW.metadata->>'mime_type',''));

  IF v_size <= 0 THEN
    RAISE EXCEPTION 'MEDIA_UPLOAD_SIZE_METADATA_INVALID' USING ERRCODE='23514';
  END IF;

  IF v_mime IN ('image/jpeg','image/png','image/webp','image/gif') THEN
    v_max_bytes := 20 * 1024 * 1024;
  ELSIF v_mime IN ('video/mp4','video/webm','video/quicktime') THEN
    v_max_bytes := 500 * 1024 * 1024;
  ELSIF v_mime IN (
    'audio/aac','audio/flac','audio/m4a','audio/mp4','audio/mpeg',
    'audio/ogg','audio/opus','audio/webm','audio/wav','audio/x-m4a','audio/x-wav'
  ) THEN
    v_max_bytes := CASE WHEN NEW.bucket_id='credichat-private'
      THEN 50 * 1024 * 1024 ELSE 500 * 1024 * 1024 END;
  ELSIF NEW.bucket_id='credichat-private' AND v_mime IN (
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','text/csv'
  ) THEN
    v_max_bytes := 100 * 1024 * 1024;
  ELSE
    RAISE EXCEPTION 'MEDIA_UPLOAD_MIME_NOT_ALLOWED' USING ERRCODE='23514';
  END IF;

  IF v_size > v_max_bytes THEN
    RAISE EXCEPTION 'MEDIA_UPLOAD_FILE_TOO_LARGE' USING ERRCODE='23514';
  END IF;

  IF NEW.bucket_id='credichat-private' THEN
    BEGIN
      v_user_id := split_part(NEW.name,'/',1)::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'PRIVATE_MEDIA_USER_PATH_INVALID' USING ERRCODE='23514';
    END;

    -- Serialize uploads per account so concurrent uploads cannot race past
    -- the plan quota. The Storage row is not inserted until this trigger ends.
    PERFORM 1 FROM public.profiles WHERE id=v_user_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRIVATE_MEDIA_USER_NOT_FOUND' USING ERRCODE='23503';
    END IF;

    SELECT nullif(p.limits->>'storage_mb','')::numeric
      INTO v_limit_mb
    FROM public.subscriptions s
    JOIN public.plans p ON p.id=s.plan_id
    WHERE s.user_id=v_user_id
      AND s.status IN ('active','trialing','past_due')
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF v_limit_mb IS NULL OR v_limit_mb <= 0 THEN
      SELECT nullif(limits->>'storage_mb','')::numeric
        INTO v_limit_mb
      FROM public.plans
      WHERE code='free' AND is_active=true
      LIMIT 1;
    END IF;
    v_limit_mb := coalesce(nullif(v_limit_mb,0),250);

    IF EXISTS (
      SELECT 1
      FROM storage.objects o
      WHERE o.bucket_id='credichat-private'
        AND o.name LIKE v_user_id::text||'/%'
        AND o.id<>NEW.id
        AND coalesce(o.metadata->>'size','') !~ '^[0-9]+$'
    ) THEN
      RAISE EXCEPTION 'PRIVATE_MEDIA_EXISTING_SIZE_METADATA_INVALID' USING ERRCODE='23514';
    END IF;

    SELECT coalesce(sum((o.metadata->>'size')::bigint),0)
      INTO v_used_bytes
    FROM storage.objects o
    WHERE o.bucket_id='credichat-private'
      AND o.name LIKE v_user_id::text||'/%'
      AND o.id<>NEW.id;

    IF v_used_bytes + v_size > floor(v_limit_mb * 1024 * 1024)::bigint THEN
      RAISE EXCEPTION 'PLAN_STORAGE_LIMIT_REACHED' USING ERRCODE='23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_media_upload_actual_limits() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.enforce_media_upload_actual_limits() TO authenticated,service_role;

DROP TRIGGER IF EXISTS enforce_media_upload_actual_limits ON storage.objects;
CREATE TRIGGER enforce_media_upload_actual_limits
BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW
EXECUTE FUNCTION private.enforce_media_upload_actual_limits();

DO $contract$
DECLARE
  def text := pg_get_functiondef('private.enforce_media_upload_actual_limits()'::regprocedure);
  trigger_def text;
BEGIN
  SELECT pg_get_triggerdef(oid) INTO trigger_def
  FROM pg_trigger
  WHERE tgrelid='storage.objects'::regclass
    AND tgname='enforce_media_upload_actual_limits'
    AND NOT tgisinternal;

  IF trigger_def IS NULL OR trigger_def NOT LIKE '%BEFORE INSERT OR UPDATE%' THEN
    RAISE EXCEPTION 'MEDIA_UPLOAD_TRIGGER_NOT_ATTACHED';
  END IF;
  IF position('PLAN_STORAGE_LIMIT_REACHED' in def)=0
     OR position('metadata' in def)=0
     OR position('credichat-private' in def)=0
     OR position('marketplace-media' in def)=0 THEN
    RAISE EXCEPTION 'MEDIA_UPLOAD_ACTUAL_LIMITS_CONTRACT_FAILED';
  END IF;
END;
$contract$;

COMMIT;