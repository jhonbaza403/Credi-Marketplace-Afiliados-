create index if not exists idx_chat_calls_created_at on public.chat_calls (created_at desc);
create index if not exists idx_chat_calls_participant_user on public.chat_call_participants (user_id, last_seen_at desc);
create index if not exists idx_chat_call_signals_recipient_call on public.chat_call_signals (recipient_id, call_id, id desc);

alter table public.chat_calls add column if not exists last_ice_restart_at timestamptz;
alter table public.chat_calls add column if not exists ended_reason text;

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

revoke all on function public.credichat_record_call_status(uuid,text,text) from public, anon;
grant execute on function public.credichat_record_call_status(uuid,text,text) to authenticated;

create or replace function public.credichat_mark_call_seen(p_call_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.chat_call_participants
  set last_seen_at = now(), updated_at = now()
  where call_id = p_call_id and user_id = auth.uid();
end;
$$;

revoke all on function public.credichat_mark_call_seen(uuid) from public, anon;
grant execute on function public.credichat_mark_call_seen(uuid) to authenticated;
