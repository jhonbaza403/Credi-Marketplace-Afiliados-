BEGIN;
SELECT plan(3);

SELECT has_function(
  'public',
  'cancel_pending_order',
  ARRAY['uuid'],
  'The guarded pending-order cancellation function exists'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.cancel_pending_order(uuid)', 'EXECUTE'),
  'Authenticated buyers may request cancellation through the guarded function'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.cancel_pending_order(uuid)', 'EXECUTE'),
  'Anonymous users cannot cancel orders'
);

SELECT * FROM finish();
ROLLBACK;
