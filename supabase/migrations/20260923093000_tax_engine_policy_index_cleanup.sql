-- Credi 360: canonicalize tax-engine RLS policies and remove duplicate indexes.
-- Keeps the same effective access while reducing redundant permissive-policy evaluation.

drop policy if exists tax_categories_read on public.tax_categories;
drop policy if exists tax_jurisdictions_read on public.tax_jurisdictions;
drop policy if exists tax_rates_read on public.tax_rates;
drop policy if exists tax_rules_read on public.tax_rules;

drop policy if exists tax_transactions_owner_read on public.tax_transactions;
drop policy if exists tax_transaction_lines_owner_read on public.tax_transaction_lines;
drop policy if exists tax_withholdings_owner_read on public.tax_withholdings;

drop policy if exists tax_transaction_lines_participant_read on public.tax_transaction_lines;
create policy tax_transaction_lines_participant_read
  on public.tax_transaction_lines
  for select to authenticated
  using (
    exists (
      select 1
      from public.tax_transactions t
      where t.id = tax_transaction_lines.tax_transaction_id
        and (
          (select auth.uid()) = t.buyer_id
          or (select auth.uid()) = t.seller_id
          or (select auth.uid()) = t.affiliate_id
          or (select auth.uid()) = t.provider_id
        )
    )
  );

drop policy if exists tax_transactions_participant_read on public.tax_transactions;
create policy tax_transactions_participant_read
  on public.tax_transactions
  for select to authenticated
  using (
    (select auth.uid()) = buyer_id
    or (select auth.uid()) = seller_id
    or (select auth.uid()) = affiliate_id
    or (select auth.uid()) = provider_id
  );

drop policy if exists tax_withholdings_payee_read on public.tax_withholdings;
create policy tax_withholdings_payee_read
  on public.tax_withholdings
  for select to authenticated
  using (
    (select auth.uid()) = payee_id
    or exists (
      select 1
      from public.tax_transactions t
      where t.id = tax_withholdings.tax_transaction_id
        and (
          (select auth.uid()) = t.buyer_id
          or (select auth.uid()) = t.seller_id
          or (select auth.uid()) = t.affiliate_id
          or (select auth.uid()) = t.provider_id
        )
    )
  );

drop index if exists public.ux_tax_transactions_order_id_source;
