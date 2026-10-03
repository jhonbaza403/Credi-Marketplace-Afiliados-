drop policy if exists marketplace_apps_owner_write on public.marketplace_apps;
create policy marketplace_apps_owner_insert on public.marketplace_apps for insert with check (publisher_id = (select auth.uid()));
create policy marketplace_apps_owner_update on public.marketplace_apps for update using (publisher_id = (select auth.uid())) with check (publisher_id = (select auth.uid()));
create policy marketplace_apps_owner_delete on public.marketplace_apps for delete using (publisher_id = (select auth.uid()));

alter policy marketplace_apps_public_read on public.marketplace_apps using (status = 'published' or publisher_id = (select auth.uid()));

alter policy wallet_accounts_owner on public.wallet_accounts using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy wallet_ledger_owner on public.wallet_ledger using (exists(select 1 from public.wallet_accounts w where w.id = wallet_id and w.user_id = (select auth.uid())));
alter policy payment_methods_owner on public.payment_methods using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy payment_orchestrations_owner on public.payment_orchestrations using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy negotiations_participant on public.negotiations using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid())) with check (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));
alter policy negotiation_offers_participant on public.negotiation_offers using (exists(select 1 from public.negotiations n where n.id = negotiation_id and (n.buyer_id = (select auth.uid()) or n.seller_id = (select auth.uid()))));
alter policy negotiation_offers_actor on public.negotiation_offers with check (actor_id = (select auth.uid()) and exists(select 1 from public.negotiations n where n.id = negotiation_id and (n.buyer_id = (select auth.uid()) or n.seller_id = (select auth.uid()))));
alter policy risk_signals_owner on public.operational_risk_signals using (user_id = (select auth.uid()));
alter policy risk_signals_owner_upsert on public.operational_risk_signals with check (user_id = (select auth.uid()));
alter policy risk_signals_owner_update on public.operational_risk_signals using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy analytics_owner on public.analytics_daily using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy developer_apps_owner on public.developer_apps using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy developer_api_keys_owner on public.developer_api_keys using (exists(select 1 from public.developer_apps a where a.id = app_id and a.owner_id = (select auth.uid()))) with check (exists(select 1 from public.developer_apps a where a.id = app_id and a.owner_id = (select auth.uid())));

create index if not exists marketplace_apps_publisher_idx on public.marketplace_apps(publisher_id);
create index if not exists negotiations_rfq_idx on public.negotiations(rfq_id);
create index if not exists negotiations_listing_idx on public.negotiations(listing_id);
create index if not exists negotiation_offers_actor_idx on public.negotiation_offers(actor_id);
create index if not exists payment_orchestrations_order_idx on public.payment_orchestrations(order_id);
create index if not exists payment_methods_user_idx on public.payment_methods(user_id);
create index if not exists wallet_ledger_reference_idx on public.wallet_ledger(reference_type,reference_id);
