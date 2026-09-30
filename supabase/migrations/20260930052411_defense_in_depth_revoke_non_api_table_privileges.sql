-- Defense-in-depth: PostgREST does not require these table privileges for application roles.
-- Keep functional SELECT/INSERT/UPDATE/DELETE grants intact while removing
-- TRUNCATE/REFERENCES/TRIGGER capabilities from client-facing roles.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
