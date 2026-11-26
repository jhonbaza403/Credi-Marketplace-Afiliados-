BEGIN;
SELECT plan(5);

SELECT ok(
  pg_get_functiondef('private.submit_kyc_identity(text,text,text,jsonb)'::regprocedure) LIKE '%bucket_id=''kyc-documents''%',
  'KYC submission verifies objects in the private kyc-documents bucket'
);

SELECT ok(
  pg_get_functiondef('private.submit_kyc_identity(text,text,text,jsonb)'::regprocedure) NOT LIKE '%bucket_id=''marketplace-media''%',
  'KYC submission never accepts identity documents from the public marketplace bucket'
);

SELECT ok(
  pg_get_functiondef('private.submit_kyc_identity(text,text,text,jsonb)'::regprocedure) LIKE '%sz>10485760%',
  'KYC submission enforces the actual stored object size limit of 10 MiB'
);

SELECT ok(
  pg_get_functiondef('private.submit_kyc_identity(text,text,text,jsonb)'::regprocedure) LIKE '%application/pdf%',
  'KYC submission supports PDF only under its explicit identity-document type check'
);

SELECT ok(
  NOT has_function_privilege('anon','private.submit_kyc_identity(text,text,text,jsonb)','EXECUTE')
  AND NOT has_function_privilege('authenticated','private.submit_kyc_identity(text,text,text,jsonb)','EXECUTE')
  AND has_function_privilege('authenticated','public.submit_kyc_identity(text,text,text,jsonb)','EXECUTE'),
  'KYC private implementation is not client-callable; restricted public wrapper is available'
);

SELECT * FROM finish();
ROLLBACK;
