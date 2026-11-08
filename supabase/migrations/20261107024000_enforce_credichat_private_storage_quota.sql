-- Enforce Credi Chat private-storage plan quotas at the Storage database boundary.
-- The Edge Function's fileSize is only a preflight hint: clients can alter it.
-- This trigger checks the actual object metadata written by Storage, serializes
-- concurrent uploads per user, and protects every upload path (including signed URLs).

CREATE OR REPLACE FUNCTION private.enforce_credichat_private_storage_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, storage
AS $function$
DECLARE
  v_user_id uuid;
  v_size_text text;
  v_file_size_bytes numeric;
  v_storage_mb numeric;
  v_limit_bytes numeric;
  v_used_bytes numeric;
BEGIN
  IF NEW.bucket_id <> 'credichat-private' THEN
    RETURN NEW;
  END IF;

  v_size_text := NEW.metadata ->> 'size';
  IF v_size_text IS NULL OR v_size_text !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'PRIVATE_STORAGE_SIZE_METADATA_REQUIRED'
      USING ERRCODE = '22023';
  END IF;

  v_file_size_bytes := v_size_text::numeric;
  IF v_file_size_bytes <= 0 THEN
    RAISE EXCEPTION 'PRIVATE_STORAGE_INVALID_FILE_SIZE'
      USING ERRCODE = '22023';
  END IF;

  IF split_part(NEW.name, '/', 1) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'PRIVATE_STORAGE_INVALID_OWNER_PATH'
      USING ERRCODE = '22023';
  END IF;
  v_user_id := split_part(NEW.name, '/', 1)::uuid;

  -- Serialize uploads for one user so simultaneous requests cannot overrun
  -- the quota after independently observing the same previous usage.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 20261107));

  SELECT CASE
           WHEN p.limits ->> 'storage_mb' ~ '^[0-9]+([.][0-9]+)?$'
             THEN (p.limits ->> 'storage_mb')::numeric
           ELSE NULL
         END
    INTO v_storage_mb
    FROM public.subscriptions AS s
    JOIN public.plans AS p ON p.id = s.plan_id
   WHERE s.user_id = v_user_id
     AND s.status IN ('active', 'trialing', 'past_due')
   ORDER BY s.created_at DESC
   LIMIT 1;

  IF v_storage_mb IS NULL OR v_storage_mb <= 0 THEN
    SELECT CASE
             WHEN p.limits ->> 'storage_mb' ~ '^[0-9]+([.][0-9]+)?$'
               THEN (p.limits ->> 'storage_mb')::numeric
             ELSE NULL
           END
      INTO v_storage_mb
      FROM public.plans AS p
     WHERE p.code = 'free'
       AND p.is_active = true
     LIMIT 1;
  END IF;

  v_storage_mb := COALESCE(NULLIF(v_storage_mb, 0), 250);
  v_limit_bytes := floor(v_storage_mb * 1024 * 1024);

  SELECT COALESCE(
           SUM(
             CASE
               WHEN o.metadata ->> 'size' ~ '^[0-9]+$'
                 THEN (o.metadata ->> 'size')::numeric
               ELSE 0
             END
           ),
           0
         )
    INTO v_used_bytes
    FROM storage.objects AS o
   WHERE o.bucket_id = 'credichat-private'
     AND split_part(o.name, '/', 1) = v_user_id::text
     AND o.id IS DISTINCT FROM NEW.id;

  IF v_used_bytes + v_file_size_bytes > v_limit_bytes THEN
    RAISE EXCEPTION 'PRIVATE_STORAGE_QUOTA_EXCEEDED'
      USING ERRCODE = '54000',
            DETAIL = format(
              'limit_bytes=%s used_bytes=%s requested_bytes=%s',
              v_limit_bytes,
              v_used_bytes,
              v_file_size_bytes
            );
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_credichat_private_storage_quota()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_credichat_private_storage_quota
  ON storage.objects;

CREATE TRIGGER enforce_credichat_private_storage_quota
BEFORE INSERT OR UPDATE OF bucket_id, name, metadata
ON storage.objects
FOR EACH ROW
EXECUTE FUNCTION private.enforce_credichat_private_storage_quota();
