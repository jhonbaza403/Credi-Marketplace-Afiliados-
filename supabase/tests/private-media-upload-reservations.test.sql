BEGIN;
SELECT plan(10);

SELECT ok(
  to_regclass('private.media_upload_reservations') IS NOT NULL,
  'private application-owned upload reservation table exists'
);

SELECT ok(
  NOT has_table_privilege('anon','private.media_upload_reservations','SELECT')
  AND NOT has_table_privilege('authenticated','private.media_upload_reservations','SELECT')
  AND NOT has_table_privilege('service_role','private.media_upload_reservations','SELECT'),
  'upload reservations are not directly readable by API roles'
);

SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid='public.reserve_private_chat_media_upload(uuid,text)'::regprocedure)
  AND (SELECT coalesce(proconfig,ARRAY[]::text[]) @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='public.reserve_private_chat_media_upload(uuid,text)'::regprocedure),
  'quota reservation RPC uses SECURITY DEFINER with an empty search_path'
);

SELECT ok(
  NOT has_function_privilege('anon','public.reserve_private_chat_media_upload(uuid,text)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.reserve_private_chat_media_upload(uuid,text)','EXECUTE')
  AND has_function_privilege('service_role','public.reserve_private_chat_media_upload(uuid,text)','EXECUTE'),
  'quota reservation RPC is server-only'
);

SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid='public.complete_private_chat_media_upload(uuid,text)'::regprocedure)
  AND (SELECT coalesce(proconfig,ARRAY[]::text[]) @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='public.complete_private_chat_media_upload(uuid,text)'::regprocedure)
  AND has_function_privilege('service_role','public.complete_private_chat_media_upload(uuid,text)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.complete_private_chat_media_upload(uuid,text)','EXECUTE'),
  'completion RPC is server-only with pinned SECURITY DEFINER context'
);

SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid='public.release_private_chat_media_upload(uuid)'::regprocedure)
  AND (SELECT coalesce(proconfig,ARRAY[]::text[]) @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='public.release_private_chat_media_upload(uuid)'::regprocedure)
  AND has_function_privilege('service_role','public.release_private_chat_media_upload(uuid)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.release_private_chat_media_upload(uuid)','EXECUTE'),
  'release RPC is server-only with pinned SECURITY DEFINER context'
);

SELECT ok(
  pg_get_functiondef('private.reserve_private_chat_media_upload(uuid,text)'::regprocedure) LIKE '%storage.objects%'
  AND pg_get_functiondef('private.reserve_private_chat_media_upload(uuid,text)'::regprocedure) LIKE '%metadata%'
  AND pg_get_functiondef('private.reserve_private_chat_media_upload(uuid,text)'::regprocedure) LIKE '%PLAN_STORAGE_LIMIT_REACHED%',
  'quota uses actual staged object metadata and rejects over-plan uploads'
);

SELECT ok(
  pg_get_functiondef('private.reserve_private_chat_media_upload(uuid,text)'::regprocedure) LIKE '%FOR UPDATE%'
  AND pg_get_functiondef('private.reserve_private_chat_media_upload(uuid,text)'::regprocedure) LIKE '%media_upload_reservations%',
  'quota reservation serializes per user and counts pending reservations'
);

SELECT ok(
  pg_get_functiondef('private.complete_private_chat_media_upload(uuid,text)'::regprocedure) LIKE '%credichat-private%'
  AND pg_get_functiondef('private.complete_private_chat_media_upload(uuid,text)'::regprocedure) LIKE '%FINAL_MEDIA_METADATA_MISMATCH%',
  'completion verifies the copied object in the final private bucket'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='storage.objects'::regclass
      AND NOT tgisinternal
      AND tgname='enforce_media_upload_actual_limits'
  ),
  'no custom triggers modify Supabase-managed Storage tables'
);

SELECT * FROM finish();
ROLLBACK;
