begin;

create or replace function private.consume_api_rate_limit_internal(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := now();
  v_row public.api_rate_limits%rowtype;
  v_reset timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode='28000';
  end if;

  if p_key is null or length(btrim(p_key)) = 0 then
    raise exception 'rate_limit_key_required' using errcode='22023';
  end if;

  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_parameters' using errcode='22023';
  end if;

  insert into public.api_rate_limits(key,count,window_started_at,updated_at)
  values (btrim(p_key),1,v_now,v_now)
  on conflict (key) do update
    set count = case
      when public.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
      then 1 else public.api_rate_limits.count + 1 end,
        window_started_at = case
      when public.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
      then v_now else public.api_rate_limits.window_started_at end,
        updated_at = v_now
  returning * into v_row;

  v_reset := v_row.window_started_at + make_interval(secs => p_window_seconds);
  allowed := v_row.count <= p_limit;
  remaining := greatest(0,p_limit-v_row.count);
  reset_at := v_reset;
  return next;
end;
$function$;

revoke execute on function private.consume_api_rate_limit_internal(text, integer, integer) from public;
revoke execute on function private.consume_api_rate_limit_internal(text, integer, integer) from anon;
grant usage on schema private to authenticated;
grant execute on function private.consume_api_rate_limit_internal(text, integer, integer) to authenticated;
grant execute on function private.consume_api_rate_limit_internal(text, integer, integer) to service_role;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, reset_at timestamptz)
language sql
security invoker
set search_path = ''
as $function$
  select * from private.consume_api_rate_limit_internal(p_key, p_limit, p_window_seconds);
$function$;

revoke execute on function public.consume_api_rate_limit(text, integer, integer) from public;
revoke execute on function public.consume_api_rate_limit(text, integer, integer) from anon;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

commit;
