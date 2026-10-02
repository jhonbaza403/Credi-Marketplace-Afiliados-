-- 020_commercial_plans.sql
-- Credi Marketplace: monetización freemium mediante planes, suscripciones y servicios premium.
-- El uso esencial de la plataforma permanece disponible con el plan Free.

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  description text not null default '',
  audience text not null default 'all' check (audience in ('all','creator','vendor','business','enterprise')),
  is_free boolean not null default false,
  is_active boolean not null default true,
  is_public boolean not null default true,
  monthly_price_minor bigint not null default 0 check (monthly_price_minor >= 0),
  yearly_price_minor bigint not null default 0 check (yearly_price_minor >= 0),
  currency char(3) not null default 'USD',
  trial_days integer not null default 0 check (trial_days between 0 and 90),
  sort_order integer not null default 0,
  limits jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_key text not null check (feature_key ~ '^[a-z0-9_.-]+$'),
  enabled boolean not null default true,
  quota bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(plan_id, feature_key),
  check (quota is null or quota >= 0)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active' check (status in ('trialing','active','past_due','paused','cancelled','expired')),
  billing_interval text not null default 'monthly' check (billing_interval in ('free','monthly','yearly')),
  started_at timestamptz not null default now(),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  last_payment_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_one_live_per_user_idx
  on public.subscriptions(user_id)
  where status in ('trialing','active','past_due','paused');

create index if not exists plans_public_order_idx
  on public.plans(is_public, is_active, sort_order);
create index if not exists plan_features_plan_idx
  on public.plan_features(plan_id);
create index if not exists subscriptions_user_status_idx
  on public.subscriptions(user_id, status);
create index if not exists subscriptions_provider_idx
  on public.subscriptions(provider, provider_subscription_id);

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  provider text,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create index if not exists subscription_events_user_idx
  on public.subscription_events(user_id, occurred_at desc);

create or replace function public.set_updated_at_plans()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at_plans();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at_plans();

create or replace function public.current_user_plan(p_user_id uuid default auth.uid())
returns table (
  plan_id uuid,
  plan_code text,
  plan_name text,
  status text,
  billing_interval text,
  limits jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id,
         p.code,
         p.name,
         coalesce(s.status, 'active'),
         coalesce(s.billing_interval, 'free'),
         p.limits
  from public.plans p
  left join lateral (
    select s.plan_id, s.status, s.billing_interval, s.created_at
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.status in ('trialing','active','past_due','paused')
    order by s.created_at desc
    limit 1
  ) s on s.plan_id = p.id
  where p.code = coalesce(
    (
      select p2.code
      from public.plans p2
      join public.subscriptions s2 on s2.plan_id = p2.id
      where s2.user_id = p_user_id
        and s2.status in ('trialing','active','past_due','paused')
      order by s2.created_at desc
      limit 1
    ),
    'free'
  )
    and p.is_active = true
  limit 1;
$$;

create or replace function public.user_has_plan_feature(
  p_feature_key text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.plan_features pf
    join public.plans p on p.id = pf.plan_id
    where p.code = coalesce(
        (
          select p2.code
          from public.plans p2
          join public.subscriptions s on s.plan_id = p2.id
          where s.user_id = p_user_id
            and s.status in ('trialing','active','past_due','paused')
          order by s.created_at desc
          limit 1
        ),
        'free'
      )
      and pf.feature_key = p_feature_key
      and pf.enabled = true
  );
$$;

-- Catálogo comercial inicial. Los precios son configurables en Supabase sin desplegar código.
insert into public.plans
  (code, name, description, audience, is_free, monthly_price_minor, yearly_price_minor, currency, sort_order, limits)
values
  ('free', 'Free', 'Acceso gratuito al ecosistema social y marketplace esencial.', 'all', true, 0, 0, 'USD', 10,
    '{"products":25,"storage_mb":250,"social_posts_month":20,"team_members":1}'::jsonb),
  ('creator', 'Creator', 'Más alcance y herramientas para creadores, afiliados y vendedores independientes.', 'creator', false, 900, 9000, 'USD', 20,
    '{"products":100,"storage_mb":2048,"social_posts_month":100,"team_members":1}'::jsonb),
  ('business', 'Business', 'Herramientas comerciales para tiendas y negocios con mayor capacidad operativa.', 'business', false, 2900, 29000, 'USD', 30,
    '{"products":1000,"storage_mb":10240,"social_posts_month":500,"team_members":5}'::jsonb),
  ('enterprise', 'Enterprise', 'Capacidades avanzadas, equipos, automatización e integraciones empresariales.', 'enterprise', false, 9900, 99000, 'USD', 40,
    '{"products":10000,"storage_mb":102400,"social_posts_month":5000,"team_members":25}'::jsonb)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  audience = excluded.audience,
  is_free = excluded.is_free,
  monthly_price_minor = excluded.monthly_price_minor,
  yearly_price_minor = excluded.yearly_price_minor,
  currency = excluded.currency,
  sort_order = excluded.sort_order,
  limits = excluded.limits,
  updated_at = now();

insert into public.plan_features (plan_id, feature_key, enabled, quota)
select p.id, x.feature_key, true, x.quota
from public.plans p
cross join (values
  ('free','marketplace.access',null::bigint),
  ('free','social.profile',null::bigint),
  ('free','affiliate.basic',null::bigint),
  ('creator','marketplace.access',null::bigint),
  ('creator','social.profile',null::bigint),
  ('creator','affiliate.basic',null::bigint),
  ('creator','social.analytics',null::bigint),
  ('creator','content.boost',100::bigint),
  ('business','marketplace.access',null::bigint),
  ('business','social.profile',null::bigint),
  ('business','affiliate.basic',null::bigint),
  ('business','social.analytics',null::bigint),
  ('business','business.analytics',null::bigint),
  ('business','social.scheduling',null::bigint),
  ('business','team.members',5::bigint),
  ('enterprise','marketplace.access',null::bigint),
  ('enterprise','social.profile',null::bigint),
  ('enterprise','affiliate.basic',null::bigint),
  ('enterprise','social.analytics',null::bigint),
  ('enterprise','business.analytics',null::bigint),
  ('enterprise','social.scheduling',null::bigint),
  ('enterprise','team.members',25::bigint),
  ('enterprise','api.access',null::bigint),
  ('enterprise','priority.support',null::bigint),
  ('enterprise','automation.advanced',null::bigint)
) as x(plan_code, feature_key, quota)
where p.code = x.plan_code
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled, quota = excluded.quota;

alter table public.plans enable row level security;
alter table public.plan_features enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;

drop policy if exists plans_public_read on public.plans;
create policy plans_public_read
on public.plans for select
using (is_public = true and is_active = true);

drop policy if exists plan_features_public_read on public.plan_features;
create policy plan_features_public_read
on public.plan_features for select
using (
  exists (
    select 1 from public.plans p
    where p.id = plan_id and p.is_public = true and p.is_active = true
  )
);

drop policy if exists subscriptions_owner_read on public.subscriptions;
create policy subscriptions_owner_read
on public.subscriptions for select
using (user_id = auth.uid());

drop policy if exists subscription_events_owner_read on public.subscription_events;
create policy subscription_events_owner_read
on public.subscription_events for select
using (user_id = auth.uid());

revoke all on public.plans from anon, authenticated;
grant select on public.plans to anon, authenticated;
revoke all on public.plan_features from anon, authenticated;
grant select on public.plan_features to anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
revoke all on public.subscription_events from anon, authenticated;
grant select on public.subscription_events to authenticated;

comment on table public.plans is 'Catálogo de planes freemium/premium de Credi Marketplace.';
comment on table public.subscriptions is 'Estado comercial de la suscripción de cada usuario.';
comment on table public.subscription_events is 'Auditoría idempotente de eventos de facturación y suscripción.';
