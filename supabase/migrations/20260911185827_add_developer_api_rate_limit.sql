begin;
create unique index if not exists usage_counters_user_metric_window_uidx on public.usage_counters(user_id,metric_key,period_start,period_end);
create or replace function public.consume_developer_api_quota(p_user_id uuid,p_api_key_id uuid,p_window_start date,p_window_end date,p_limit bigint)
returns boolean
language plpgsql
security definer
set search_path='public'
as $$
declare current_count bigint;
 metric text := 'developer_api:'||p_api_key_id::text;
begin
 if p_limit is null or p_limit < 1 then raise exception 'INVALID_LIMIT'; end if;
 insert into public.usage_counters(user_id,metric_key,period_start,period_end,quantity,metadata)
 values(p_user_id,metric,p_window_start,p_window_end,0,jsonb_build_object('api_key_id',p_api_key_id))
 on conflict(user_id,metric_key,period_start,period_end) do nothing;
 select quantity into current_count from public.usage_counters where user_id=p_user_id and metric_key=metric and period_start=p_window_start and period_end=p_window_end for update;
 if current_count >= p_limit then return false; end if;
 update public.usage_counters set quantity=quantity+1,updated_at=now() where user_id=p_user_id and metric_key=metric and period_start=p_window_start and period_end=p_window_end;
 return true;
end;
$$;
revoke all on function public.consume_developer_api_quota(uuid,uuid,date,date,bigint) from public;
revoke all on function public.consume_developer_api_quota(uuid,uuid,date,date,bigint) from anon;
revoke all on function public.consume_developer_api_quota(uuid,uuid,date,date,bigint) from authenticated;
grant execute on function public.consume_developer_api_quota(uuid,uuid,date,date,bigint) to service_role;
commit;
