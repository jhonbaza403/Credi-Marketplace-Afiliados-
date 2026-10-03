create or replace function public.credichat_touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

revoke all on function public.credichat_touch_conversation_on_message() from public, anon, authenticated;

drop trigger if exists credichat_touch_conversation_on_message on public.messages;
create trigger credichat_touch_conversation_on_message
after insert or update on public.messages
for each row execute function public.credichat_touch_conversation_on_message();
