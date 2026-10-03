-- 1) Protect marketplace market rules from direct authenticated writes.
alter table public.commerce_market_rules enable row level security;
revoke insert, update, delete, truncate, trigger, references on public.commerce_market_rules from authenticated;
drop policy if exists commerce_market_rules_authenticated_select on public.commerce_market_rules;
create policy commerce_market_rules_authenticated_select
  on public.commerce_market_rules
  for select
  to authenticated
  using (true);

-- 2) Remove redundant duplicate uniqueness/index definitions without weakening integrity.
alter table public.affiliate_product_links drop constraint if exists affiliate_product_links_unique_pair;
drop index if exists public.b2b_products_public_idx;
drop index if exists public.idx_orders_affiliate_id;

-- 3) Optimize RLS policies that repeatedly evaluate auth functions per row.
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
        coalesce(qual, '') ~* 'auth\\.[a-z_][a-z0-9_]*\\(\\)' or
        coalesce(with_check, '') ~* 'auth\\.[a-z_][a-z0-9_]*\\(\\)'
      )
      and (
        coalesce(qual, '') !~* '\\(select\\s+auth\\.[a-z_][a-z0-9_]*\\(\\)\\)' or
        coalesce(with_check, '') !~* '\\(select\\s+auth\\.[a-z_][a-z0-9_]*\\(\\)\\)'
      )
  loop
    v_using := r.qual;
    v_check := r.with_check;

    if v_using is not null then
      v_using := regexp_replace(v_using,'auth\\.([a-z_][a-z0-9_]*)\\(\\)','(select auth.\\1())','gi');
    end if;
    if v_check is not null then
      v_check := regexp_replace(v_check,'auth\\.([a-z_][a-z0-9_]*)\\(\\)','(select auth.\\1())','gi');
    end if;

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
