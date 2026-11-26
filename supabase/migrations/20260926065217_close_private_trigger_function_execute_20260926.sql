DO $$
BEGIN
  -- This trigger function is introduced by a later reconciliation migration.
  -- A clean catalog must not fail while attempting to revoke a function that
  -- has not been created yet. The later migration applies the definitive ACL.
  IF to_regprocedure('private.validate_settlement_binding_currency()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION private.validate_settlement_binding_currency() FROM PUBLIC, anon, authenticated';
  END IF;
END
$$;
