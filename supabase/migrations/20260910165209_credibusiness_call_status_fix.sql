create or replace function public.credichat_record_call_status(
  p_call_id uuid,
  p_status text,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.chat_call_participants
    where call_id = p_call_id and user_id = auth.uid()
  ) then
    raise exception 'not_authorized';
  end if;
  update public.chat_calls
  set status = p_status,
      ended_reason = coalesce(p_reason, ended_reason),
      updated_at = now(),
      started_at = case when p_status = 'active' and started_at is null then now() else started_at end,
      ended_at = case when p_status in ('ended','declined','missed','failed') then coalesce(ended_at, now()) else ended_at end
  where id = p_call_id;
end;
$$;

create or replace function public.credichat_mark_call_seen(p_call_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.chat_call_participants
  set last_seen_at = now()
  where call_id = p_call_id and user_id = auth.uid();
end;
$$;

revoke all on function public.credichat_record_call_status(uuid,text,text) from public, anon;
grant execute on function public.credichat_record_call_status(uuid,text,text) to authenticated;
revoke all on function public.credichat_mark_call_seen(uuid) from public, anon;
grant execute on function public.credichat_mark_call_seen(uuid) to authenticated;
