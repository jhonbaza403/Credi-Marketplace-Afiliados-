begin;

-- Marketplace views can safely run as invoker because the public-facing base
-- tables already expose only published/verified rows through RLS policies.
alter view public.published_products set (security_invoker = true);
alter view public.published_b2b_products set (security_invoker = true);
alter view public.verified_businesses set (security_invoker = true);
alter view public.verified_b2b_products set (security_invoker = true);

-- Internal chat helper functions must never be anonymously callable.
revoke execute on function public.create_credichat_direct_conversation(uuid,uuid,uuid,uuid,uuid,text,jsonb) from anon;
revoke execute on function public.credichat_is_member(uuid,uuid) from anon;
revoke execute on function public.credichat_mark_call_seen(uuid) from anon;
revoke execute on function public.credichat_member_profile_ids(uuid[]) from anon;
revoke execute on function public.credichat_record_call_status(uuid,text,text) from anon;
revoke execute on function public.ensure_my_credi_pin() from anon;
revoke execute on function public.get_b2b_access_context(uuid) from anon;
revoke execute on function public.get_credi_contact(text) from anon;
revoke execute on function public.get_credi_contact_by_pin(text) from anon;
revoke execute on function public.get_transaction_rating_targets(uuid) from anon;
revoke execute on function public.set_my_credi_phone(text) from anon;
revoke execute on function public.submit_transaction_rating(uuid,uuid,smallint,text,jsonb) from anon;
revoke execute on function public.wallet_transfer(uuid,numeric,text,text) from anon;

-- The authentication trigger is not an RPC entry point.
revoke execute on function public.sync_credi_profile_from_auth() from public;
revoke execute on function public.sync_credi_profile_from_auth() from anon;
revoke execute on function public.sync_credi_profile_from_auth() from authenticated;

-- Tighten the intentionally public affiliate click endpoint at the function body
-- level while retaining anonymous access for public referral links.
create or replace function public.record_affiliate_product_click(p_link_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare next_clicks bigint;
begin
  update public.affiliate_product_links
     set clicks = clicks + 1, updated_at = now()
   where id = p_link_id and is_active = true
   returning clicks into next_clicks;
  if next_clicks is null then raise exception 'affiliate link not active'; end if;
  return next_clicks;
end;
$$;

commit;
