create or replace function public.create_credichat_direct_conversation(
  p_target_user_id uuid,
  p_product_id uuid default null,
  p_order_id uuid default null,
  p_store_id uuid default null,
  p_b2b_product_id uuid default null,
  p_title text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_key text;
  v_conversation_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_target_user_id is null or p_target_user_id = v_user_id then raise exception 'invalid_target'; end if;
  v_key := least(v_user_id::text,p_target_user_id::text) || ':' || greatest(v_user_id::text,p_target_user_id::text);
  select id into v_conversation_id from public.conversations where kind='direct' and direct_key=v_key limit 1;
  if v_conversation_id is null then
    insert into public.conversations(created_by,kind,title,product_id,order_id,store_id,b2b_product_id,direct_key,metadata)
    values(v_user_id,'direct',nullif(trim(p_title),''),p_product_id,p_order_id,p_store_id,p_b2b_product_id,v_key,coalesce(p_metadata,'{}'::jsonb))
    returning id into v_conversation_id;
  end if;
  insert into public.conversation_members(conversation_id,user_id,member_role) values(v_conversation_id,v_user_id,'member') on conflict do nothing;
  insert into public.conversation_members(conversation_id,user_id,member_role) values(v_conversation_id,p_target_user_id,'member') on conflict do nothing;
  return v_conversation_id;
end;
$$;
revoke all on function public.create_credichat_direct_conversation(uuid,uuid,uuid,uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.create_credichat_direct_conversation(uuid,uuid,uuid,uuid,uuid,text,jsonb) to authenticated;
