begin;
create table if not exists public.commerce_dispute_events (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.commerce_disputes(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  event_type text not null check (event_type in ('opened','evidence_added','response_added','under_review','resolved','rejected','cancelled')),
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists commerce_dispute_events_dispute_created_idx on public.commerce_dispute_events(dispute_id,created_at);
alter table public.commerce_dispute_events enable row level security;
create policy dispute_events_participant_select on public.commerce_dispute_events for select to authenticated using (
  exists (select 1 from public.commerce_disputes d where d.id=commerce_dispute_events.dispute_id and (d.opened_by=auth.uid() or d.counterparty_id=auth.uid() or exists(select 1 from public.stores s where s.id=d.store_id and s.vendor_id=auth.uid())))
);
create policy dispute_events_actor_insert on public.commerce_dispute_events for insert to authenticated with check (
  actor_id=auth.uid() and exists (select 1 from public.commerce_disputes d where d.id=commerce_dispute_events.dispute_id and (d.opened_by=auth.uid() or d.counterparty_id=auth.uid() or exists(select 1 from public.stores s where s.id=d.store_id and s.vendor_id=auth.uid())))
);

create table if not exists public.commerce_dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.commerce_disputes(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  evidence_type text not null check (evidence_type in ('image','video','document','link','text')),
  storage_path text,
  public_url text,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text,
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists commerce_dispute_evidence_dispute_created_idx on public.commerce_dispute_evidence(dispute_id,created_at);
alter table public.commerce_dispute_evidence enable row level security;
create policy dispute_evidence_participant_select on public.commerce_dispute_evidence for select to authenticated using (
  exists (select 1 from public.commerce_disputes d where d.id=commerce_dispute_evidence.dispute_id and (d.opened_by=auth.uid() or d.counterparty_id=auth.uid() or exists(select 1 from public.stores s where s.id=d.store_id and s.vendor_id=auth.uid())))
);
create policy dispute_evidence_participant_insert on public.commerce_dispute_evidence for insert to authenticated with check (
  uploaded_by=auth.uid() and exists (select 1 from public.commerce_disputes d where d.id=commerce_dispute_evidence.dispute_id and (d.opened_by=auth.uid() or d.counterparty_id=auth.uid() or exists(select 1 from public.stores s where s.id=d.store_id and s.vendor_id=auth.uid())))
);
commit;
