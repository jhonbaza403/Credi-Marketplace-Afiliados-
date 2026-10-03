create or replace function private.submit_transaction_rating(p_order_id uuid,p_store_id uuid,p_score smallint,p_comment text default null,p_dimensions jsonb default '{}'::jsonb)
returns public.transaction_ratings
language plpgsql
security definer
set search_path=''
as $function$
declare
 u uuid := (select auth.uid());
 r public.transaction_ratings;
 reviewee uuid;
 role_name text;
 product uuid;
 vendor uuid;
 buyer uuid;
 rl record;
 constraint_name text;
 v_order public.orders;
begin
 if u is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;

 select * into rl from public.consume_api_rate_limit('rating_submit:'||u::text,30,3600);
 if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;

 if p_order_id is null or p_store_id is null then raise exception 'INVALID_RATING'; end if;
 if p_score is null or p_score < 1 or p_score > 5 then raise exception 'INVALID_SCORE'; end if;
 if p_comment is not null and char_length(trim(p_comment)) > 1200 then raise exception 'COMMENT_TOO_LONG'; end if;
 if jsonb_typeof(coalesce(p_dimensions,'{}'::jsonb)) <> 'object' or pg_column_size(coalesce(p_dimensions,'{}'::jsonb)) > 8192 then raise exception 'INVALID_DIMENSIONS'; end if;

 select * into v_order from public.orders where id=p_order_id for share;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if v_order.status <> 'delivered' then raise exception 'RATING_NOT_ELIGIBLE'; end if;

 select o.buyer_id,s.vendor_id,oi.product_id
 into buyer,vendor,product
 from public.orders o
 join public.order_items oi on oi.order_id=o.id
 join public.stores s on s.id=oi.store_id
 where o.id=p_order_id and s.id=p_store_id
 order by oi.created_at,oi.id
 limit 1;

 if buyer is null or vendor is null then raise exception 'RATING_NOT_ELIGIBLE'; end if;

 if u=buyer then
   reviewee:=vendor; role_name:='buyer';
 elsif u=vendor then
   reviewee:=buyer; role_name:='seller';
 else
   raise exception 'RATING_NOT_ELIGIBLE';
 end if;

 if reviewee is null or reviewee=u then raise exception 'INVALID_REVIEWEE'; end if;
 if not exists(select 1 from public.profiles where id=reviewee and is_active=true) then raise exception 'REVIEWEE_NOT_ACTIVE'; end if;

 if exists(
   select 1 from public.transaction_ratings
   where order_id=p_order_id and store_id=p_store_id and reviewer_id=u and reviewee_id=reviewee
 ) then
   raise exception 'ALREADY_RATED' using errcode='55000';
 end if;

 begin
   insert into public.transaction_ratings(
     order_id,store_id,product_id,reviewer_id,reviewee_id,reviewer_role,
     score,dimensions,comment,status,created_at,updated_at
   )
   values(
     p_order_id,p_store_id,product,u,reviewee,role_name,
     p_score,coalesce(p_dimensions,'{}'::jsonb),nullif(trim(p_comment),''),
     'published',now(),now()
   )
   returning * into r;
 exception when unique_violation then
   get stacked diagnostics constraint_name=constraint_name;
   if constraint_name='transaction_ratings_unique_party_per_order_store' then
     raise exception 'ALREADY_RATED' using errcode='55000';
   end if;
   raise;
 end;

 return r;
end;
$function$;

revoke all on function private.submit_transaction_rating(uuid,uuid,smallint,text,jsonb) from public,anon,authenticated;

create or replace function public.submit_transaction_rating(p_order_id uuid,p_store_id uuid,p_score smallint,p_comment text default null,p_dimensions jsonb default '{}'::jsonb)
returns public.transaction_ratings
language sql
security invoker
set search_path=''
as $function$
 select private.submit_transaction_rating($1,$2,$3,$4,$5);
$function$;

revoke all on function public.submit_transaction_rating(uuid,uuid,smallint,text,jsonb) from public,anon;
grant execute on function public.submit_transaction_rating(uuid,uuid,smallint,text,jsonb) to authenticated;
