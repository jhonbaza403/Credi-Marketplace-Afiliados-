-- Credi Reputation: bilateral, transaction-backed ratings.
-- A rating is only valid when both parties participated in a delivered order.
create table if not exists public.transaction_ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid null references public.products(id) on delete set null,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  reviewer_role text not null check (reviewer_role in ('buyer','seller')),
  score smallint not null check (score between 1 and 5),
  dimensions jsonb not null default '{}'::jsonb,
  comment text null check (comment is null or char_length(trim(comment)) between 1 and 1200),
  status text not null default 'published' check (status in ('published','hidden','under_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_ratings_reviewer_reviewee_different check (reviewer_id <> reviewee_id),
  constraint transaction_ratings_unique_party_per_order_store unique (order_id, store_id, reviewer_id)
);

create index if not exists transaction_ratings_reviewee_created_idx on public.transaction_ratings(reviewee_id, created_at desc);
create index if not exists transaction_ratings_order_store_idx on public.transaction_ratings(order_id, store_id);

alter table public.transaction_ratings enable row level security;

drop policy if exists transaction_ratings_select_public on public.transaction_ratings;
create policy transaction_ratings_select_public
on public.transaction_ratings for select
using (status = 'published' or reviewer_id = auth.uid() or reviewee_id = auth.uid());

revoke insert, update, delete on public.transaction_ratings from anon, authenticated;

create or replace function public.get_transaction_rating_targets(p_order_id uuid)
returns table (
  store_id uuid,
  product_id uuid,
  store_name text,
  counterpart_id uuid,
  counterpart_role text,
  counterpart_name text,
  can_rate boolean,
  already_rated boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return;
  end if;

  return query
  with order_rows as (
    select
      o.id as order_id,
      o.buyer_id,
      oi.store_id,
      oi.product_id,
      s.store_name,
      s.vendor_id
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    join public.stores s on s.id = oi.store_id
    where o.id = p_order_id
      and o.status = 'delivered'
      and o.buyer_id = v_user
  ),
  buyer_targets as (
    select distinct on (r.store_id)
      r.store_id, r.product_id, r.store_name,
      r.vendor_id as counterpart_id,
      'seller'::text as counterpart_role,
      coalesce(p.full_name, r.store_name) as counterpart_name,
      true as can_rate,
      exists (
        select 1 from public.transaction_ratings tr
        where tr.order_id = r.order_id and tr.store_id = r.store_id and tr.reviewer_id = v_user
      ) as already_rated
    from order_rows r
    left join public.profiles p on p.id = r.vendor_id
    where r.vendor_id <> v_user
    order by r.store_id, r.product_id
  ),
  seller_targets as (
    select distinct on (oi.store_id)
      oi.store_id, oi.product_id, s.store_name,
      o.buyer_id as counterpart_id,
      'buyer'::text as counterpart_role,
      coalesce(p.full_name, 'Cliente Credi') as counterpart_name,
      true as can_rate,
      exists (
        select 1 from public.transaction_ratings tr
        where tr.order_id = o.id and tr.store_id = oi.store_id and tr.reviewer_id = v_user
      ) as already_rated
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    join public.stores s on s.id = oi.store_id
    join public.profiles p on p.id = o.buyer_id
    where o.id = p_order_id
      and o.status = 'delivered'
      and s.vendor_id = v_user
      and o.buyer_id <> v_user
    order by oi.store_id, oi.product_id
  )
  select * from buyer_targets
  union all
  select * from seller_targets;
end;
$$;

create or replace function public.submit_transaction_rating(
  p_order_id uuid,
  p_store_id uuid,
  p_score smallint,
  p_comment text default null,
  p_dimensions jsonb default '{}'::jsonb
)
returns public.transaction_ratings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_rating public.transaction_ratings;
  v_reviewee uuid;
  v_role text;
  v_product uuid;
begin
  if v_user is null then raise exception 'UNAUTHORIZED'; end if;
  if p_score < 1 or p_score > 5 then raise exception 'INVALID_SCORE'; end if;
  if p_comment is not null and char_length(trim(p_comment)) > 1200 then raise exception 'COMMENT_TOO_LONG'; end if;

  if exists (
    select 1 from public.transaction_ratings tr
    where tr.order_id = p_order_id and tr.store_id = p_store_id and tr.reviewer_id = v_user
  ) then
    raise exception 'ALREADY_RATED';
  end if;

  select s.vendor_id, oi.product_id
  into v_reviewee, v_product
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  join public.stores s on s.id = oi.store_id
  where o.id = p_order_id
    and s.id = p_store_id
    and o.status = 'delivered'
    and (o.buyer_id = v_user or s.vendor_id = v_user)
  limit 1;

  if v_reviewee is null then raise exception 'RATING_NOT_ELIGIBLE'; end if;

  if exists (select 1 from public.orders where id = p_order_id and buyer_id = v_user) then
    v_role := 'buyer';
    select s.vendor_id into v_reviewee from public.stores s where s.id = p_store_id;
  else
    v_role := 'seller';
    select o.buyer_id into v_reviewee from public.orders o where o.id = p_order_id;
  end if;

  if v_reviewee is null or v_reviewee = v_user then raise exception 'INVALID_REVIEWEE'; end if;

  insert into public.transaction_ratings (
    order_id, store_id, product_id, reviewer_id, reviewee_id, reviewer_role, score, dimensions, comment
  )
  values (
    p_order_id, p_store_id, v_product, v_user, v_reviewee, v_role, p_score,
    coalesce(p_dimensions,'{}'::jsonb), nullif(trim(p_comment),'')
  )
  returning * into v_rating;

  return v_rating;
end;
$$;

revoke execute on function public.get_transaction_rating_targets(uuid) from public;
grant execute on function public.get_transaction_rating_targets(uuid) to authenticated;
revoke execute on function public.submit_transaction_rating(uuid,uuid,smallint,text,jsonb) from public;
grant execute on function public.submit_transaction_rating(uuid,uuid,smallint,text,jsonb) to authenticated;

create or replace view public.reputation_profiles as
select
  p.id as user_id,
  count(tr.id)::bigint as rating_count,
  round(coalesce(avg(tr.score), 0), 2) as average_score,
  count(*) filter (where tr.score = 5)::bigint as five_star,
  count(*) filter (where tr.score = 4)::bigint as four_star,
  count(*) filter (where tr.score = 3)::bigint as three_star,
  count(*) filter (where tr.score = 2)::bigint as two_star,
  count(*) filter (where tr.score = 1)::bigint as one_star,
  case
    when count(tr.id) < 5 then 'new'
    when avg(tr.score) >= 4.7 then 'excellent'
    when avg(tr.score) >= 4.2 then 'good'
    when avg(tr.score) >= 3.5 then 'regular'
    else 'at_risk'
  end as reputation_level
from public.profiles p
left join public.transaction_ratings tr
  on tr.reviewee_id = p.id and tr.status = 'published'
group by p.id;
