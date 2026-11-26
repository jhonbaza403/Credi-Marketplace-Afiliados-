BEGIN;

SELECT plan(12);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM pg_trigger AS t
      JOIN pg_class AS c ON c.oid = t.tgrelid
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = 'storage'
       AND c.relname = 'objects'
       AND t.tgname = 'enforce_credichat_private_storage_quota'
       AND NOT t.tgisinternal
  ),
  'per-MIME and private quota trigger is installed on Storage objects'
);

SELECT ok(
  (
    SELECT p.prosecdef
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
     WHERE n.nspname = 'private'
       AND p.proname = 'enforce_credichat_private_storage_quota'
  ),
  'quota and media limits run with controlled SECURITY DEFINER privileges'
);

SELECT ok(
  NOT has_function_privilege('anon', 'private.enforce_credichat_private_storage_quota()', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'private.enforce_credichat_private_storage_quota()', 'EXECUTE')
  AND NOT has_function_privilege('service_role', 'private.enforce_credichat_private_storage_quota()', 'EXECUTE'),
  'API roles cannot invoke the internal Storage trigger function directly'
);

SELECT lives_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'credichat-private',
      '00000000-0000-0000-0000-000000000001/quota-under-limit.mp4',
      jsonb_build_object('size', 209715200, 'mimetype', 'video/mp4')
    )
  $$,
  'private video within the default free quota is accepted'
);

SELECT throws_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'credichat-private',
      '00000000-0000-0000-0000-000000000001/quota-over-limit.mp4',
      jsonb_build_object('size', 62914560, 'mimetype', 'video/mp4')
    )
  $$,
  '54000',
  'PRIVATE_STORAGE_QUOTA_EXCEEDED',
  'actual object size cannot push private storage above the plan quota'
);

SELECT lives_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'marketplace-media',
      '00000000-0000-0000-0000-000000000002/image-at-limit.jpg',
      jsonb_build_object('size', 20971520, 'mimetype', 'image/jpeg')
    )
  $$,
  'public marketplace accepts an image at the 20 MiB limit'
);

SELECT throws_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'marketplace-media',
      '00000000-0000-0000-0000-000000000003/image-over-limit.jpg',
      jsonb_build_object('size', 22020096, 'mimetype', 'image/jpeg')
    )
  $$,
  '54000',
  'MARKETPLACE_IMAGE_TOO_LARGE',
  'public marketplace cannot accept an image larger than 20 MiB'
);

SELECT lives_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'marketplace-media',
      '00000000-0000-0000-0000-000000000004/video-under-limit.mp4',
      jsonb_build_object('size', 419430400, 'mimetype', 'video/mp4')
    )
  $$,
  'public marketplace accepts a video below the 500 MiB limit'
);

SELECT throws_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'marketplace-media',
      '00000000-0000-0000-0000-000000000005/not-allowed.pdf',
      jsonb_build_object('size', 1048576, 'mimetype', 'application/pdf')
    )
  $$,
  '22023',
  'MEDIA_MIME_NOT_ALLOWED_FOR_BUCKET',
  'public marketplace rejects private document MIME types'
);

SELECT lives_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'credichat-private',
      '00000000-0000-0000-0000-000000000006/private-pdf-under-limit.pdf',
      jsonb_build_object('size', 94371840, 'mimetype', 'application/pdf')
    )
  $$,
  'private chat accepts a PDF below the 100 MiB per-file limit'
);

SELECT throws_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'credichat-private',
      '00000000-0000-0000-0000-000000000007/private-pdf-over-limit.pdf',
      jsonb_build_object('size', 105906176, 'mimetype', 'application/pdf')
    )
  $$,
  '54000',
  'PRIVATE_MEDIA_FILE_TOO_LARGE',
  'private chat rejects a PDF larger than 100 MiB'
);

SELECT throws_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'credichat-private',
      '00000000-0000-0000-0000-000000000008/private-audio-over-limit.mp3',
      jsonb_build_object('size', 53477376, 'mimetype', 'audio/mpeg')
    )
  $$,
  '54000',
  'PRIVATE_MEDIA_FILE_TOO_LARGE',
  'private chat rejects audio larger than 50 MiB'
);

SELECT * FROM finish();
ROLLBACK;
