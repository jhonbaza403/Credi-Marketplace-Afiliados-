create table if not exists public.ai_request_dedup (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  session_id uuid references public.ai_sessions(id) on delete cascade,
  status text not null default 'processing' check (status in ('processing','completed')),
  response jsonb,
  status_code integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

create index if not exists ai_request_dedup_created_idx
  on public.ai_request_dedup(created_at);

alter table public.ai_request_dedup enable row level security;

drop policy if exists ai_request_dedup_owner_select on public.ai_request_dedup;
create policy ai_request_dedup_owner_select
  on public.ai_request_dedup for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists ai_request_dedup_owner_insert on public.ai_request_dedup;
create policy ai_request_dedup_owner_insert
  on public.ai_request_dedup for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists ai_request_dedup_owner_update on public.ai_request_dedup;
create policy ai_request_dedup_owner_update
  on public.ai_request_dedup for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.ai_request_dedup from anon;
revoke all on public.ai_request_dedup from authenticated;
grant select, insert, update on public.ai_request_dedup to authenticated;

insert into public.plan_features(plan_id, feature_key, enabled, quota)
select p.id, 'ai.copilot', true, null
from public.plans p
where p.code in ('creator','business','enterprise')
on conflict (plan_id, feature_key)
do update set enabled = excluded.enabled, quota = excluded.quota;

delete from public.plan_features pf
using public.plans p
where pf.plan_id = p.id
  and pf.feature_key = 'ai.copilot'
  and p.code = 'free';

comment on table public.ai_request_dedup is 'Idempotency guard for authenticated Credi AI requests; completed responses are replayed only to their owning user.';
