do $$
declare
  r record;
  v_using text;
  v_check text;
  v_sql text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%auth.uid()%' or
        coalesce(with_check, '') like '%auth.uid()%'
      )
  loop
    v_using := case
      when r.qual is null then null
      else replace(r.qual, 'auth.uid()', '(select auth.uid())')
    end;
    v_check := case
      when r.with_check is null then null
      else replace(r.with_check, 'auth.uid()', '(select auth.uid())')
    end;

    v_sql := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if v_using is not null and v_check is not null then
      v_sql := v_sql || format(' using (%s) with check (%s)', v_using, v_check);
    elsif v_using is not null then
      v_sql := v_sql || format(' using (%s)', v_using);
    elsif v_check is not null then
      v_sql := v_sql || format(' with check (%s)', v_check);
    end if;
    execute v_sql;
  end loop;
end $$;
