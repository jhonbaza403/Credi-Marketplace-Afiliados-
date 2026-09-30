begin;

create table if not exists public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'copilot' check (mode in ('copilot','strategy','marketing','sales','intelligence')),
  last_response_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,id)
);

create index if not exists ai_sessions_user_updated_idx on public.ai_sessions(user_id,updated_at desc);

alter table public.ai_sessions enable row level security;

drop policy if exists ai_sessions_owner_all on public.ai_sessions;
create policy ai_sessions_owner_all on public.ai_sessions
for all to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

grant select,insert,update,delete on public.ai_sessions to authenticated;

commit;
