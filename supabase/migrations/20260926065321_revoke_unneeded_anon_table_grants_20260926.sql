
do $$
declare r record;
begin
  for r in
    select distinct t.tablename
    from pg_tables t
    join information_schema.role_table_grants g
      on g.table_schema='public' and g.table_name=t.tablename and g.grantee='anon'
    where t.schemaname='public'
      and t.rowsecurity
      and not exists (
        select 1 from pg_policies pol
        where pol.schemaname='public'
          and pol.tablename=t.tablename
          and ('anon'=any(pol.roles) or 'public'=any(pol.roles))
      )
  loop
    execute format('revoke all on table public.%I from anon', r.tablename);
  end loop;
end $$;
