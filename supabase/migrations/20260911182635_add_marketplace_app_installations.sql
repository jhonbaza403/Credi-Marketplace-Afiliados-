create table if not exists public.marketplace_app_installations (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.marketplace_apps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  scopes text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(app_id,user_id)
);
alter table public.marketplace_app_installations enable row level security;
drop policy if exists marketplace_app_installations_owner_select on public.marketplace_app_installations;
create policy marketplace_app_installations_owner_select on public.marketplace_app_installations for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists marketplace_app_installations_owner_insert on public.marketplace_app_installations;
create policy marketplace_app_installations_owner_insert on public.marketplace_app_installations for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.marketplace_apps a where a.id = marketplace_app_installations.app_id and a.status = 'published'));
drop policy if exists marketplace_app_installations_owner_update on public.marketplace_app_installations;
create policy marketplace_app_installations_owner_update on public.marketplace_app_installations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index if not exists marketplace_app_installations_user_idx on public.marketplace_app_installations(user_id,updated_at desc);
create index if not exists marketplace_app_installations_app_idx on public.marketplace_app_installations(app_id,updated_at desc);
