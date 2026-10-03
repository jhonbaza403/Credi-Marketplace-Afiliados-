revoke execute on function public.get_transaction_rating_targets(uuid) from anon, public;
grant execute on function public.get_transaction_rating_targets(uuid) to authenticated;
revoke execute on function public.submit_transaction_rating(uuid,uuid,smallint,text,jsonb) from anon, public;
grant execute on function public.submit_transaction_rating(uuid,uuid,smallint,text,jsonb) to authenticated;
alter view public.reputation_profiles set (security_invoker = true);
revoke all on public.reputation_profiles from anon;
grant select on public.reputation_profiles to authenticated;

alter function public.normalize_credi_phone(text) set search_path = public, extensions;
