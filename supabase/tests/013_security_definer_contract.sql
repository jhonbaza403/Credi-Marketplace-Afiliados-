-- Credi 360 SECURITY DEFINER contract.
-- The Supabase advisor warning for authenticated callers is intentional only for
-- user-facing RPCs in this allowlist. Internal accounting/settlement RPCs must
-- remain inaccessible to authenticated and anon roles.

begin;

do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and has_function_privilege('anon', p.oid, 'EXECUTE');

  if v_bad <> 0 then
    raise exception 'SECURITY DEFINER functions callable by anon: %', v_bad;
  end if;
end $$;

do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and coalesce(array_to_string(p.proconfig,','),'') <> 'search_path=""';

  if v_bad <> 0 then
    raise exception 'SECURITY DEFINER search_path contract failed for % functions', v_bad;
  end if;
end $$;

do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    and p.proname not in (
      'accept_negotiation',
      'create_b2b_award',
      'create_credichat_direct_conversation',
      'credichat_is_member',
      'credichat_mark_call_seen',
      'credichat_member_profile_ids',
      'credichat_record_call_status',
      'ensure_my_credi_pin',
      'ensure_my_wallet',
      'get_b2b_access_context',
      'get_credi_contact',
      'get_credi_contact_by_pin',
      'get_transaction_rating_targets',
      'initialize_order_tax_transaction',
      'set_my_credi_phone',
      'submit_kyc_identity',
      'submit_transaction_rating',
      'wallet_pay_order',
      'wallet_transfer'
    );

  if v_bad <> 0 then
    raise exception 'Unexpected authenticated SECURITY DEFINER RPCs: %', v_bad;
  end if;
end $$;

do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and p.proname in ('settle_order_inventory','record_affiliate_product_click','finalize_order_settlement_allocations')
    and has_function_privilege('authenticated', p.oid, 'EXECUTE');

  if v_bad <> 0 then
    raise exception 'Internal settlement/accounting SECURITY DEFINER RPC exposed to authenticated role';
  end if;
end $$;

raise notice 'TEST 013 — SECURITY DEFINER CONTRACT: PASS';
rollback;
