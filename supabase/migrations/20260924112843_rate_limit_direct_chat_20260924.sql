create or replace function public.create_credichat_direct_conversation(p_target_user_id uuid,p_product_id uuid default null,p_order_id uuid default null,p_store_id uuid default null,p_b2b_product_id uuid default null,p_title text default null,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare u uuid:=(select auth.uid()); k text; cid uuid; active boolean; ord public.orders; st public.stores; pr public.products; rl record;
begin
 if u is null then raise exception 'UNAUTHORIZED'; end if;
 select * into rl from public.consume_api_rate_limit('credichat_direct:'||u::text,30,60); if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;
 if p_target_user_id is null or p_target_user_id=u then raise exception 'INVALID_TARGET'; end if;
 if length(coalesce(p_title,''))>200 or pg_column_size(coalesce(p_metadata,'{}'::jsonb))>8192 then raise exception 'INVALID_CONVERSATION_PAYLOAD'; end if;
 select coalesce(is_active,false) into active from public.profiles where id=p_target_user_id; if not coalesce(active,false) then raise exception 'TARGET_NOT_AVAILABLE'; end if;
 if p_store_id is not null then select * into st from public.stores where id=p_store_id; if not found or st.vendor_id not in(u,p_target_user_id) then raise exception 'STORE_CONTEXT_FORBIDDEN'; end if; end if;
 if p_product_id is not null then select * into pr from public.products where id=p_product_id; if not found or pr.store_id is null then raise exception 'PRODUCT_CONTEXT_INVALID'; end if; if p_store_id is not null and pr.store_id<>p_store_id then raise exception 'PRODUCT_STORE_MISMATCH'; end if; if not exists(select 1 from public.stores s where s.id=pr.store_id and s.vendor_id in(u,p_target_user_id)) then raise exception 'PRODUCT_CONTEXT_FORBIDDEN'; end if; end if;
 if p_order_id is not null then select * into ord from public.orders where id=p_order_id; if not found or not(ord.buyer_id=u or ord.buyer_id=p_target_user_id or exists(select 1 from public.order_items oi join public.stores s on s.id=oi.store_id where oi.order_id=p_order_id and s.vendor_id in(u,p_target_user_id))) then raise exception 'ORDER_CONTEXT_FORBIDDEN'; end if; end if;
 k:=least(u::text,p_target_user_id::text)||':'||greatest(u::text,p_target_user_id::text);
 select id into cid from public.conversations where kind='direct' and direct_key=k limit 1;
 if cid is null then insert into public.conversations(created_by,kind,title,product_id,order_id,store_id,b2b_product_id,direct_key,metadata) values(u,'direct',nullif(trim(p_title),''),p_product_id,p_order_id,p_store_id,p_b2b_product_id,k,coalesce(p_metadata,'{}'::jsonb)) returning id into cid; end if;
 insert into public.conversation_members(conversation_id,user_id,member_role) values(cid,u,'member') on conflict do nothing;
 insert into public.conversation_members(conversation_id,user_id,member_role) values(cid,p_target_user_id,'member') on conflict do nothing;
 return cid;
end;$function$;
