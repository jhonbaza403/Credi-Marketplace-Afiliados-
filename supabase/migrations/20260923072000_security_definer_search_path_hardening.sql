-- Credi 360°: pin every public SECURITY DEFINER function to an empty search_path.
-- Function bodies in the current schema use schema-qualified relations; this prevents
-- caller-controlled objects from being resolved through an inherited search path.
do $$
declare r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
  loop
    execute format('alter function public.%I(%s) set search_path = ''''', r.proname, r.args);
  end loop;
end $$;

revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;
