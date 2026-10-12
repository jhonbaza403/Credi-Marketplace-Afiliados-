create or replace function public.get_b2b_access_context(p_user_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.get_b2b_access_context($1);
$function$;

revoke all on function public.get_b2b_access_context(uuid) from public, anon;
grant execute on function public.get_b2b_access_context(uuid) to authenticated, service_role;

grant execute on function private.get_b2b_access_context(uuid) to authenticated, service_role;
