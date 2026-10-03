create index if not exists idx_fk_settlement_allocations_tax_transaction_id on public.settlement_allocations (tax_transaction_id);
create index if not exists idx_fk_tax_certificates_jurisdiction_id on public.tax_certificates (jurisdiction_id);
create index if not exists idx_fk_tax_collections_jurisdiction_id on public.tax_collections (jurisdiction_id);
create index if not exists idx_fk_tax_collections_tax_transaction_id on public.tax_collections (tax_transaction_id);
create index if not exists idx_fk_tax_exemptions_jurisdiction_id on public.tax_exemptions (jurisdiction_id);
create index if not exists idx_fk_tax_exemptions_tax_category_id on public.tax_exemptions (tax_category_id);
create index if not exists idx_fk_tax_filings_jurisdiction_id on public.tax_filings (jurisdiction_id);
create index if not exists idx_fk_tax_jurisdictions_parent_jurisdiction_id on public.tax_jurisdictions (parent_jurisdiction_id);
create index if not exists idx_fk_tax_rates_tax_category_id on public.tax_rates (tax_category_id);
create index if not exists idx_fk_tax_rules_rate_id on public.tax_rules (rate_id);
create index if not exists idx_fk_tax_rules_tax_category_id on public.tax_rules (tax_category_id);
create index if not exists idx_fk_tax_transaction_lines_jurisdiction_id on public.tax_transaction_lines (jurisdiction_id);
create index if not exists idx_fk_tax_transaction_lines_tax_category_id on public.tax_transaction_lines (tax_category_id);
create index if not exists idx_fk_tax_transaction_lines_tax_rule_id on public.tax_transaction_lines (tax_rule_id);
create index if not exists idx_fk_tax_transactions_jurisdiction_id on public.tax_transactions (jurisdiction_id);
create index if not exists idx_fk_tax_withholdings_jurisdiction_id on public.tax_withholdings (jurisdiction_id);
create index if not exists idx_fk_tax_withholdings_order_id on public.tax_withholdings (order_id);
create index if not exists idx_fk_tax_withholdings_tax_transaction_id on public.tax_withholdings (tax_transaction_id);

drop index if exists public.conversations_order_idx;
drop index if exists public.conversations_product_idx;

drop policy if exists advertisements_owner_insert on public.advertisements;
drop policy if exists advertisements_owner_update on public.advertisements;
drop policy if exists feed_posts_owner_insert on public.feed_posts;
drop policy if exists feed_posts_owner_update on public.feed_posts;
drop policy if exists reels_owner_insert on public.reels;
drop policy if exists reels_owner_update on public.reels;
drop policy if exists stories_owner_insert on public.stories;
drop policy if exists stories_owner_update on public.stories;
drop policy if exists order_items_select_own on public.order_items;
drop policy if exists orders_select_own on public.orders;
drop policy if exists profiles_select_own on public.profiles;

alter policy stories_select_public_or_own on public.stories using (((visibility = 'public'::text) and (moderation_status = 'approved'::text) and (expires_at > now())) or (owner_id = (select auth.uid())) or is_admin());
drop policy if exists stories_public_select on public.stories;
