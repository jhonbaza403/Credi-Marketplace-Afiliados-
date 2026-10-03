create or replace function public.submit_transaction_rating(p_order_id uuid,p_store_id uuid,p_score smallint,p_comment text default null,p_dimensions jsonb default '{}'::jsonb)
returns public.transaction_ratings language plpgsql security definer set search_path=''
as $function$
declare v_user uuid:=(select auth.uid()); v_rating public.transaction_ratings; v_reviewee uuid; v_role text; v_product uuid; v_store_vendor uuid; v_buyer uuid;
begin
 if v_user is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
 if p_order_id is null or p_store_id is null then raise exception 'INVALID_ARGUMENT' using errcode='22023'; end if;
 if p_score is null or p_score<1 or p_score>5 then raise exception 'INVALID_SCORE' using errcode='22023'; end if;
 if p_comment is not null and char_length(trim(p_comment))>1200 then raise exception 'COMMENT_TOO_LONG' using errcode='22023'; end if;
 if jsonb_typeof(coalesce(p_dimensions,'{}'::jsonb))<>'object' or pg_column_size(coalesce(p_dimensions,'{}'::jsonb))>8192 then raise exception 'INVALID_DIMENSIONS' using errcode='22023'; end if;
 select o.buyer_id,s.vendor_id,oi.product_id into v_buyer,v_store_vendor,v_product
 from public.orders o join public.order_items oi on oi.order_id=o.id join public.stores s on s.id=oi.store_id
 where o.id=p_order_id and s.id=p_store_id and o.status='delivered' limit 1;
 if v_buyer is null or v_store_vendor is null then raise exception 'RATING_NOT_ELIGIBLE' using errcode='42501'; end if;
 if v_user=v_buyer then v_reviewee:=v_store_vendor; v_role:='buyer';
 elsif v_user=v_store_vendor then v_reviewee:=v_buyer; v_role:='seller';
 else raise exception 'RATING_NOT_ELIGIBLE' using errcode='42501'; end if;
 if v_reviewee=v_user then raise exception 'INVALID_REVIEWEE' using errcode='22023'; end if;
 insert into public.transaction_ratings(order_id,store_id,product_id,reviewer_id,reviewee_id,reviewer_role,score,dimensions,comment)
 values(p_order_id,p_store_id,v_product,v_user,v_reviewee,v_role,p_score,coalesce(p_dimensions,'{}'::jsonb),nullif(trim(p_comment),''))
 returning * into v_rating;
 return v_rating;
exception when unique_violation then raise exception 'ALREADY_RATED' using errcode='55000';
end;
$function$;
