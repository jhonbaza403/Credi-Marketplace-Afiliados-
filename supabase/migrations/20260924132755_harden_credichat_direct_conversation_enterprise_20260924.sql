create or replace function private.create_credichat_direct_conversation(
p_target_user_id uuid,p_product_id uuid,p_order_id uuid,p_store_id uuid,p_b2b_product_id uuid,p_title text,p_metadata jsonb
) returns uuid language plpgsql security definer set search_path='' as $function$
declare
u uuid:=(select auth.uid()); k text; cid uuid; active boolean;
ord public.orders; st public.stores; pr public.products; bp public.b2b_products; conv public.conversations; rl record;
begin
if u is null then raise exception 'UNAUTHORIZED'; end if;
if p_target_user_id is null or p_target_user_id=u then raise exception 'INVALID_TARGET'; end if;
if length(coalesce(p_title,''))>200 then raise exception 'INVALID_CONVERSATION_TITLE'; end if;
if pg_column_size(coalesce(p_metadata,'{}'::jsonb))>8192 then raise exception 'INVALID_CONVERSATION_METADATA'; end if;
select * into rl from public.consume_api_rate_limit('credichat_direct:'||u::text,30,60);
if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;

select coalesce(is_active,false) into active from public.profiles where id=p_target_user_id;
if not coalesce(active,false) then raise exception 'TARGET_NOT_AVAILABLE'; end if;

if p_store_id is not null then
 select * into st from public.stores where id=p_store_id;
 if not found then raise exception 'STORE_NOT_FOUND'; end if;
 if not st.is_active then raise exception 'STORE_INACTIVE'; end if;
 if st.vendor_id not in(u,p_target_user_id) then raise exception 'STORE_CONTEXT_FORBIDDEN'; end if;
end if;

if p_product_id is not null then
 select * into pr from public.products where id=p_product_id;
 if not found or pr.store_id is null then raise exception 'PRODUCT_CONTEXT_INVALID'; end if;
 if p_store_id is not null and pr.store_id<>p_store_id then raise exception 'PRODUCT_STORE_MISMATCH'; end if;
 if not exists(select 1 from public.stores s where s.id=pr.store_id and s.is_active and s.vendor_id in(u,p_target_user_id)) then raise exception 'PRODUCT_CONTEXT_FORBIDDEN'; end if;
end if;

if p_b2b_product_id is not null then
 select * into bp from public.b2b_products where id=p_b2b_product_id;
 if not found or bp.status<>'active' or bp.moderation_status<>'approved' then raise exception 'B2B_PRODUCT_CONTEXT_INVALID'; end if;
 if bp.supplier_id not in(u,p_target_user_id) then raise exception 'B2B_PRODUCT_CONTEXT_FORBIDDEN'; end if;
end if;

if p_order_id is not null then
 select * into ord from public.orders where id=p_order_id;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if not(ord.buyer_id=u or ord.buyer_id=p_target_user_id or exists(
   select 1 from public.order_items oi join public.stores s on s.id=oi.store_id
   where oi.order_id=p_order_id and s.vendor_id in(u,p_target_user_id)
 )) then raise exception 'ORDER_CONTEXT_FORBIDDEN'; end if;
end if;

k:=least(u::text,p_target_user_id::text)||':'||greatest(u::text,p_target_user_id::text);

insert into public.conversations(created_by,kind,title,product_id,order_id,store_id,b2b_product_id,direct_key,metadata)
values(u,'direct',nullif(trim(p_title),''),p_product_id,p_order_id,p_store_id,p_b2b_product_id,k,coalesce(p_metadata,'{}'::jsonb))
on conflict (direct_key) where kind='direct' and direct_key is not null do nothing
returning id into cid;

if cid is null then
 select * into conv from public.conversations where kind='direct' and direct_key=k for update;
 if not found then raise exception 'CONVERSATION_CREATE_RACE'; end if;
 cid:=conv.id;
end if;

insert into public.conversation_members(conversation_id,user_id,member_role)
values(cid,u,'member') on conflict(conversation_id,user_id) do nothing;
insert into public.conversation_members(conversation_id,user_id,member_role)
values(cid,p_target_user_id,'member') on conflict(conversation_id,user_id) do nothing;

return cid;
end;$function$;
revoke all on function private.create_credichat_direct_conversation(uuid,uuid,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
