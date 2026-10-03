create policy affiliate_commission_ledger_deny_authenticated on public.affiliate_commission_ledger for all to authenticated using (false) with check (false);
create policy idempotency_keys_deny_authenticated on public.idempotency_keys for all to authenticated using (false) with check (false);
create policy platform_revenue_deny_authenticated on public.platform_revenue for all to authenticated using (false) with check (false);
create policy webhook_events_deny_authenticated on public.webhook_events for all to authenticated using (false) with check (false);
revoke all on table public.affiliate_commission_ledger from anon, authenticated;
revoke all on table public.idempotency_keys from anon, authenticated;
revoke all on table public.platform_revenue from anon, authenticated;
revoke all on table public.webhook_events from anon, authenticated;
