create or replace function public.create_credichat_direct_conversation(p_target_user_id uuid,p_product_id uuid default null,p_order_id uuid default null,p_store_id uuid default null,p_b2b_product_id uuid default null,p_title text default null,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare v_user uuid:=(select auth.uid()); v_key text; v_conversation_id uuid; v_target_active boolean; v_order public.orders; v_store public.stores; v_product public.products;
begin
 if v_user is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
 if p_target_user_id is null or p_target_user_id=v_user then raise exception 'INVALID_TARGET' using errcode='22023'; end if;
 if length(coalesce(p_title,''))>200 or pg_column_size(coalesce(p_metadata,'{}'::jsonb))>8192 then raise exception 'INVALID_CONVERSATION_PAYLOAD' using errcode='22023'; end if;
 select coalesce(is_active,false) into v_target_active from public.profiles where id=p_target_user_id;
 if not coalesce(v_target_active,false) then raise exception 'TARGET_NOT_AVAILABLE' using errcode='42501'; end if;
 if p_store_id is not null then
  select * into v_store from public.stores where id=p_store_id;
  if not found or v_store.vendor_id not in (v_user,p_target_user_id) then raise exception 'STORE_CONTEXT_FORBIDDEN' using errcode='42501'; end if;
 end if;
 if p_product_id is not null then
  select * into v_product from public.products where id=p_product_id;
  if not found or v_product.store_id is null then raise exception 'PRODUCT_CONTEXT_INVALID' using errcode='22023'; end if;
  if p_store_id is not null and v_product.store_id<>p_store_id then raise exception 'PRODUCT_STORE_MISMATCH' using errcode='22023'; end if;
  if not exists(select 1 from public.stores s where s.id=v_product.store_id and s.vendor_id in (v_user,p_target_user_id)) then raise exception 'PRODUCT_CONTEXT_FORBIDDEN' using errcode='42501'; end if;
 end if;
 if p_order_id is not null then
  select * into v_order from public.orders where id=p_order_id;
  if not found or not (v_order.buyer_id=v_user or v_order.buyer_id=p_target_user_id or exists(select 1 from public.order_items oi join public.stores s on s.id=oi.store_id where oi.order_id=p_order_id and s.vendor_id in (v_user,p_target_user_id))) then raise exception 'ORDER_CONTEXT_FORBIDDEN' using errcode='42501'; end if;
 end if;
 if p_b2b_product_id is not null then
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='b2b_products' and column_name='id') then raise exception 'B2B_CONTEXT_UNAVAILABLE'; end if;
 end if;
 v_key:=least(v_user::text,p_target_user_id::text)||':'||greatest(v_user::text,p_target_user_id::text);
 select id into v_conversation_id from public.conversations where kind='direct' and direct_key=v_key limit 1 for update;
 if v_conversation_id is null then
  insert into public.conversations(created_by,kind,title,product_id,order_id,store_id,b2b_product_id,direct_key,metadata)
  values(v_user,'direct',nullif(trim(p_title),''),p_product_id,p_order_id,p_store_id,p_b2b_product_id,v_key,coalesce(p_metadata,'{}'::jsonb)) returning id into v_conversation_id;
 end if;
 insert into public.conversation_members(conversation_id,user_id,member_role) values(v_conversation_id,v_user,'member') on conflict do nothing;
 insert into public.conversation_members(conversation_id,user_id,member_role) values(v_conversation_id,p_target_user_id,'member') on conflict do nothing;
 return v_conversation_id;
end;$function$;
