begin;

-- Restrict financial wallet payment RPC from unauthenticated callers.
revoke execute on function public.wallet_pay_order(uuid, text) from public, anon;
grant execute on function public.wallet_pay_order(uuid, text) to authenticated, service_role;

-- Avoid per-row auth context initialization in RLS policies while preserving semantics.
alter policy tax_certificates_owner_read on public.tax_certificates
  using ((select auth.uid()) = taxpayer_id);

alter policy tax_transaction_lines_participant_read on public.tax_transaction_lines
  using (exists (
    select 1
    from public.tax_transactions t
    where t.id = tax_transaction_lines.tax_transaction_id
      and (
        (select auth.uid()) = t.buyer_id
        or (select auth.uid()) = t.seller_id
        or (select auth.uid()) = t.affiliate_id
        or (select auth.uid()) = t.provider_id
      )
  ));

alter policy tax_transactions_participant_read on public.tax_transactions
  using (
    (select auth.uid()) = buyer_id
    or (select auth.uid()) = seller_id
    or (select auth.uid()) = affiliate_id
    or (select auth.uid()) = provider_id
  );

alter policy tax_withholdings_payee_read on public.tax_withholdings
  using ((select auth.uid()) = payee_id);

alter policy settlement_allocations_related_read on public.settlement_allocations
  using (
    exists (
      select 1
      from public.orders o
      where o.id = settlement_allocations.order_id
        and o.buyer_id = (select auth.uid())
    )
    or beneficiary_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and ((p.platform_owner = true) or (p.role = 'admin'::public.user_role))
    )
  );

commit;
