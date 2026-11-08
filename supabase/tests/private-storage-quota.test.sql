BEGIN;

SELECT plan(5);

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
  'private chat quota trigger is installed on Storage objects'
);

SELECT ok(
  (
    SELECT p.prosecdef
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
     WHERE n.nspname = 'private'
       AND p.proname = 'enforce_credichat_private_storage_quota'
  ),
  'quota enforcement runs with controlled SECURITY DEFINER privileges'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'private.enforce_credichat_private_storage_quota()',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'private.enforce_credichat_private_storage_quota()',
    'EXECUTE'
  ),
  'API roles cannot invoke the internal quota trigger function directly'
);

SELECT lives_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'credichat-private',
      '00000000-0000-0000-0000-000000000001/quota-under-limit.bin',
      jsonb_build_object('size', 209715200, 'mimetype', 'application/octet-stream')
    )
  $$,
  'private upload within the default free quota is accepted'
);

SELECT throws_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'credichat-private',
      '00000000-0000-0000-0000-000000000001/quota-over-limit.bin',
      jsonb_build_object('size', 62914560, 'mimetype', 'application/octet-stream')
    )
  $$,
  '54000',
  'PRIVATE_STORAGE_QUOTA_EXCEEDED',
  'actual object size cannot push private storage above the plan quota'
);

SELECT * FROM finish();
ROLLBACK;
