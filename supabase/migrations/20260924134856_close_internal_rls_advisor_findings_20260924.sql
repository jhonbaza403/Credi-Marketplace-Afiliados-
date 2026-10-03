
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='settlement_account_bindings' and policyname='deny_external_access') then
    create policy deny_external_access on public.settlement_account_bindings for all to anon, authenticated using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='settlement_approval_audit' and policyname='deny_external_access') then
    create policy deny_external_access on public.settlement_approval_audit for all to anon, authenticated using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='settlement_payout_audit' and policyname='deny_external_access') then
    create policy deny_external_access on public.settlement_payout_audit for all to anon, authenticated using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='wallet_journals' and policyname='deny_external_access') then
    create policy deny_external_access on public.wallet_journals for all to anon, authenticated using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='wallet_refunds' and policyname='deny_external_access') then
    create policy deny_external_access on public.wallet_refunds for all to anon, authenticated using (false) with check (false);
  end if;
end $$;
