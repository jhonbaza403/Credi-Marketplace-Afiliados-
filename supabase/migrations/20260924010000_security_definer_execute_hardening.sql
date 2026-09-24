-- Credi production hardening: explicit EXECUTE grants for SECURITY DEFINER RPCs.
-- Keep user-facing RPCs available only to authenticated/service_role; privileged settlement is service_role-only.

revoke execute on function public.accept_negotiation(uuid,uuid) from public,anon;
grant execute on function public.accept_negotiation(uuid,uuid) to authenticated,service_role;
revoke execute on function public.create_b2b_award(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.create_b2b_award(uuid,uuid,uuid,uuid) to authenticated,service_role;
revoke execute on function public.create_credichat_direct_conversation(uuid,uuid,uuid,uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.create_credichat_direct_conversation(uuid,uuid,uuid,uuid,uuid,text,jsonb) to authenticated,service_role;
revoke execute on function public.credichat_is_member(uuid,uuid) from public,anon;
grant execute on function public.credichat_is_member(uuid,uuid) to authenticated,service_role;
revoke execute on function public.credichat_mark_call_seen(uuid) from public,anon;
grant execute on function public.credichat_mark_call_seen(uuid) to authenticated,service_role;
revoke execute on function public.credichat_member_profile_ids(uuid[]) from public,anon;
grant execute on function public.credichat_member_profile_ids(uuid[]) to authenticated,service_role;
revoke execute on function public.credichat_record_call_status(uuid,text,text) from public,anon;
grant execute on function public.credichat_record_call_status(uuid,text,text) to authenticated,service_role;
revoke execute on function public.ensure_my_credi_pin() from public,anon;
grant execute on function public.ensure_my_credi_pin() to authenticated,service_role;
revoke execute on function public.ensure_my_wallet() from public,anon;
grant execute on function public.ensure_my_wallet() to authenticated,service_role;
revoke execute on function public.get_b2b_access_context(uuid) from public,anon;
grant execute on function public.get_b2b_access_context(uuid) to authenticated,service_role;
revoke execute on function public.get_credi_contact(text) from public,anon;
grant execute on function public.get_credi_contact(text) to authenticated,service_role;
revoke execute on function public.get_credi_contact_by_pin(text) from public,anon;
grant execute on function public.get_credi_contact_by_pin(text) to authenticated,service_role;
revoke execute on function public.get_transaction_rating_targets(uuid) from public,anon;
grant execute on function public.get_transaction_rating_targets(uuid) to authenticated,service_role;
revoke execute on function public.initialize_order_tax_transaction(uuid) from public,anon;
grant execute on function public.initialize_order_tax_transaction(uuid) to authenticated,service_role;
revoke execute on function public.set_my_credi_phone(text) from public,anon;
grant execute on function public.set_my_credi_phone(text) to authenticated,service_role;
revoke execute on function public.submit_kyc_identity(text,text,text,jsonb) from public,anon;
grant execute on function public.submit_kyc_identity(text,text,text,jsonb) to authenticated,service_role;
revoke execute on function public.submit_transaction_rating(uuid,uuid,smallint,text,jsonb) from public,anon;
grant execute on function public.submit_transaction_rating(uuid,uuid,smallint,text,jsonb) to authenticated,service_role;
revoke execute on function public.wallet_pay_order(uuid,text) from public,anon;
grant execute on function public.wallet_pay_order(uuid,text) to authenticated,service_role;
revoke execute on function public.wallet_transfer(uuid,numeric,text,text) from public,anon;
grant execute on function public.wallet_transfer(uuid,numeric,text,text) to authenticated,service_role;

revoke execute on function public.finalize_order_settlement_allocations(uuid) from public,anon,authenticated;
grant execute on function public.finalize_order_settlement_allocations(uuid) to service_role;
