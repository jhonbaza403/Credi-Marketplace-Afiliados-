create or replace function public.create_b2b_award(
  p_rfq_id uuid,
  p_quote_id uuid,
  p_buyer_id uuid,
  p_negotiation_id uuid default null
)
returns table(
  award_id uuid,
  rfq_id uuid,
  quote_id uuid,
  buyer_id uuid,
  supplier_id uuid,
  status text,
  negotiation_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rfq public.business_rfqs%rowtype;
  v_quote public.business_rfq_quotes%rowtype;
  v_award public.b2b_awards%rowtype;
  v_existing public.b2b_awards%rowtype;
begin
  if auth.uid() is null or p_buyer_id is null or auth.uid() <> p_buyer_id then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_rfq from public.business_rfqs where id = p_rfq_id for update;
  if not found then raise exception 'RFQ_NOT_FOUND'; end if;
  if v_rfq.buyer_id <> p_buyer_id then raise exception 'BUYER_MISMATCH'; end if;
  if v_rfq.status not in ('open', 'published') then raise exception 'RFQ_NOT_OPEN'; end if;

  select * into v_quote
  from public.business_rfq_quotes
  where id = p_quote_id and rfq_id = p_rfq_id
  for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;
  if v_quote.status not in ('submitted', 'accepted') then raise exception 'QUOTE_NOT_AWARDABLE'; end if;

  if exists (
    select 1 from public.b2b_awards
    where rfq_id = p_rfq_id
      and status in ('awarded', 'accepted', 'ordered')
      and quote_id <> p_quote_id
  ) then
    raise exception 'RFQ_ALREADY_AWARDED';
  end if;

  select * into v_existing from public.b2b_awards where quote_id = p_quote_id limit 1;
  if found then
    return query select v_existing.id, v_existing.rfq_id, v_existing.quote_id,
      v_existing.buyer_id, v_existing.supplier_id, v_existing.status, v_existing.negotiation_id;
    return;
  end if;

  update public.business_rfq_quotes
  set status = 'accepted', updated_at = now()
  where id = p_quote_id;

  update public.business_rfq_quotes
  set status = 'rejected', updated_at = now()
  where rfq_id = p_rfq_id
    and id <> p_quote_id
    and status in ('submitted', 'accepted');

  insert into public.b2b_awards(
    rfq_id, quote_id, buyer_id, supplier_id, store_id, status, negotiation_id
  )
  values(
    p_rfq_id, p_quote_id, p_buyer_id, v_quote.supplier_id,
    v_quote.store_id, 'awarded', p_negotiation_id
  )
  returning * into v_award;

  return query select v_award.id, v_award.rfq_id, v_award.quote_id,
    v_award.buyer_id, v_award.supplier_id, v_award.status, v_award.negotiation_id;
end;
$$;

revoke all on function public.create_b2b_award(uuid, uuid, uuid, uuid) from public;
grant execute on function public.create_b2b_award(uuid, uuid, uuid, uuid) to authenticated;

create index if not exists idx_b2b_awards_buyer_rfq on public.b2b_awards(buyer_id, rfq_id);
create index if not exists idx_b2b_awards_quote on public.b2b_awards(quote_id);

alter table public.b2b_awards enable row level security;
drop policy if exists b2b_awards_buyer_select on public.b2b_awards;
create policy b2b_awards_buyer_select on public.b2b_awards
for select to authenticated
using (buyer_id = auth.uid() or supplier_id = auth.uid());
