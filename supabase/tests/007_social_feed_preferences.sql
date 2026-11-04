-- RLS contract for explicit social-feed preferences.
-- Run after 20261102100000_social_feed_preferences.sql in Supabase staging.

begin;

do $$
declare
  v_has_rls boolean;
  v_own_policy_count integer;
begin
  select c.relrowsecurity into v_has_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'social_feed_preferences';

  if v_has_rls is distinct from true then
    raise exception 'FAIL: social_feed_preferences must have RLS enabled';
  end if;

  select count(*) into v_own_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'social_feed_preferences'
    and roles @> array['authenticated']::name[]
    and coalesce(qual,'') like '%auth.uid()%';

  if v_own_policy_count < 2 then
    raise exception 'FAIL: own-row SELECT/DELETE policies are missing';
  end if;

  if has_table_privilege('anon', 'public.social_feed_preferences', 'SELECT')
     or has_table_privilege('anon', 'public.social_feed_preferences', 'INSERT')
     or has_table_privilege('authenticated', 'public.social_feed_preferences', 'TRUNCATE') then
    raise exception 'FAIL: social preference table privileges are too broad';
  end if;
end;
$$;

rollback;
