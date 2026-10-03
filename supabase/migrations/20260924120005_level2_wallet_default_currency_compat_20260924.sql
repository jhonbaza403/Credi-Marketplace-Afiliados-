
create or replace function public.ensure_my_wallet()
returns public.wallet_accounts
language plpgsql
security invoker
set search_path=''
as $function$
begin
  return public.ensure_my_wallet('USD');
end
$function$;

revoke all on function public.ensure_my_wallet() from public,anon;
grant execute on function public.ensure_my_wallet() to authenticated;
