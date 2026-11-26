BEGIN;
SELECT plan(8);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='storage.objects'::regclass
      AND tgname='enforce_media_upload_actual_limits'
      AND NOT tgisinternal
      AND pg_get_triggerdef(oid) LIKE '%BEFORE INSERT OR UPDATE%'
  ),
  'Storage object writes are guarded by the actual-size trigger'
);

SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid='private.enforce_media_upload_actual_limits()'::regprocedure),
  'media upload guard executes with trusted definer privileges'
);

SELECT ok(
  (SELECT coalesce(proconfig,ARRAY[]::text[]) @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='private.enforce_media_upload_actual_limits()'::regprocedure),
  'media upload guard pins an empty search_path'
);

SELECT ok(
  NOT has_function_privilege('anon','private.enforce_media_upload_actual_limits()','EXECUTE')
  AND has_function_privilege('authenticated','private.enforce_media_upload_actual_limits()','EXECUTE')
  AND has_function_privilege('service_role','private.enforce_media_upload_actual_limits()','EXECUTE'),
  'media upload trigger is executable only by trusted authenticated and service roles'
);

SELECT ok(
  pg_get_functiondef('private.enforce_media_upload_actual_limits()'::regprocedure) LIKE '%NEW.metadata%'
  AND pg_get_functiondef('private.enforce_media_upload_actual_limits()'::regprocedure) LIKE '%MEDIA_UPLOAD_FILE_TOO_LARGE%',
  'per-file limits use the stored object metadata, not the client-declared size'
);

SELECT ok(
  pg_get_functiondef('private.enforce_media_upload_actual_limits()'::regprocedure) LIKE '%PLAN_STORAGE_LIMIT_REACHED%'
  AND pg_get_functiondef('private.enforce_media_upload_actual_limits()'::regprocedure) LIKE '%FOR UPDATE%',
  'private chat plan quota is enforced under a per-user row lock'
);

SELECT ok(
  pg_get_functiondef('private.enforce_media_upload_actual_limits()'::regprocedure) LIKE '%credichat-private%'
  AND pg_get_functiondef('private.enforce_media_upload_actual_limits()'::regprocedure) LIKE '%marketplace-media%',
  'actual-size enforcement covers both marketplace and private chat buckets'
);

SELECT ok(
  (SELECT NOT public AND file_size_limit=524288000
     AND allowed_mime_types @> ARRAY[
       'application/pdf','application/msword',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'application/vnd.ms-excel',
       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
       'application/vnd.ms-powerpoint',
       'application/vnd.openxmlformats-officedocument.presentationml.presentation',
       'text/plain','text/csv'
     ]
   FROM storage.buckets WHERE id='credichat-private'),
  'private chat bucket accepts the document formats supported by the client'
);

SELECT * FROM finish();
ROLLBACK;
