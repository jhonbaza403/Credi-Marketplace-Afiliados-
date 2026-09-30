begin;

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 180),
  objective text not null default 'sales' check (objective in ('awareness','traffic','engagement','leads','sales','catalog','live_attendance')),
  status text not null default 'draft' check (status in ('draft','review','active','paused','completed','archived')),
  currency text not null default 'USD' check (char_length(currency)=3),
  daily_budget numeric(20,2) not null default 0 check (daily_budget >= 0),
  lifetime_budget numeric(20,2) check (lifetime_budget is null or lifetime_budget >= 0),
  start_at timestamptz,
  end_at timestamptz,
  optimization_goal text not null default 'conversions',
  bid_strategy text not null default 'auto',
  destination_url text,
  product_id uuid references public.products(id) on delete set null,
  live_room_id uuid references public.chat_live_rooms(id) on delete set null,
  audience_config jsonb not null default '{}'::jsonb,
  placement_config jsonb not null default '{}'::jsonb,
  attribution_config jsonb not null default '{"click_window_days":7,"view_window_days":1}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_audiences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  audience_type text not null check (audience_type in ('custom','retargeting','lookalike','interest','contextual','saved')),
  rules jsonb not null default '{}'::jsonb,
  membership_days integer not null default 30 check (membership_days between 1 and 540),
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_ad_sets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  status text not null default 'draft' check (status in ('draft','active','paused','completed','archived')),
  audience_id uuid references public.marketing_audiences(id) on delete set null,
  audience_snapshot jsonb not null default '{}'::jsonb,
  placements jsonb not null default '["credi_wall","credi_story","credi_reel","credi_marketplace","credi_live"]'::jsonb,
  schedule_config jsonb not null default '{}'::jsonb,
  daily_budget numeric(20,2) not null default 0 check (daily_budget >= 0),
  bid_strategy text not null default 'auto',
  optimization_goal text not null default 'conversions',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_creatives (
  id uuid primary key default gen_random_uuid(),
  ad_set_id uuid not null references public.marketing_ad_sets(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  media jsonb not null default '[]'::jsonb,
  primary_texts jsonb not null default '[]'::jsonb,
  headlines jsonb not null default '[]'::jsonb,
  call_to_action text not null default 'Comprar',
  destination_url text,
  product_id uuid references public.products(id) on delete set null,
  creative_hash text,
  status text not null default 'draft' check (status in ('draft','review','active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_ads (
  id uuid primary key default gen_random_uuid(),
  ad_set_id uuid not null references public.marketing_ad_sets(id) on delete cascade,
  creative_id uuid not null references public.marketing_creatives(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  status text not null default 'draft' check (status in ('draft','review','active','paused','completed','archived')),
  delivery_state text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(ad_set_id,creative_id)
);

create table if not exists public.marketing_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  ad_id uuid references public.marketing_ads(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_name text not null check (char_length(trim(event_name)) between 2 and 80),
  source text not null default 'credi',
  session_id text,
  operation_id uuid,
  value numeric(20,8),
  currency text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  metric_date date not null,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  views bigint not null default 0,
  engagements bigint not null default 0,
  leads bigint not null default 0,
  purchases bigint not null default 0,
  spend numeric(20,2) not null default 0,
  revenue numeric(20,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id,metric_date)
);

alter table public.marketing_campaigns enable row level security;
alter table public.marketing_audiences enable row level security;
alter table public.marketing_ad_sets enable row level security;
alter table public.marketing_creatives enable row level security;
alter table public.marketing_ads enable row level security;
alter table public.marketing_events enable row level security;
alter table public.marketing_daily_metrics enable row level security;

drop policy if exists marketing_campaigns_owner_all on public.marketing_campaigns;
create policy marketing_campaigns_owner_all on public.marketing_campaigns for all to authenticated
using (owner_id=(select auth.uid()) or (select public.is_admin()))
with check (owner_id=(select auth.uid()) or (select public.is_admin()));

drop policy if exists marketing_audiences_owner_all on public.marketing_audiences;
create policy marketing_audiences_owner_all on public.marketing_audiences for all to authenticated
using (owner_id=(select auth.uid()) or (select public.is_admin()))
with check (owner_id=(select auth.uid()) or (select public.is_admin()));

drop policy if exists marketing_ad_sets_owner_all on public.marketing_ad_sets;
create policy marketing_ad_sets_owner_all on public.marketing_ad_sets for all to authenticated
using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=(select auth.uid()) or (select public.is_admin()))))
with check (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=(select auth.uid()) or (select public.is_admin()))));

drop policy if exists marketing_creatives_owner_all on public.marketing_creatives;
create policy marketing_creatives_owner_all on public.marketing_creatives for all to authenticated
using (exists(select 1 from public.marketing_ad_sets s join public.marketing_campaigns c on c.id=s.campaign_id where s.id=ad_set_id and (c.owner_id=(select auth.uid()) or (select public.is_admin()))))
with check (exists(select 1 from public.marketing_ad_sets s join public.marketing_campaigns c on c.id=s.campaign_id where s.id=ad_set_id and (c.owner_id=(select auth.uid()) or (select public.is_admin()))));

drop policy if exists marketing_ads_owner_all on public.marketing_ads;
create policy marketing_ads_owner_all on public.marketing_ads for all to authenticated
using (exists(select 1 from public.marketing_ad_sets s join public.marketing_campaigns c on c.id=s.campaign_id where s.id=ad_set_id and (c.owner_id=(select auth.uid()) or (select public.is_admin()))))
with check (exists(select 1 from public.marketing_ad_sets s join public.marketing_campaigns c on c.id=s.campaign_id where s.id=ad_set_id and (c.owner_id=(select auth.uid()) or (select public.is_admin()))));

drop policy if exists marketing_events_owner_select on public.marketing_events;
create policy marketing_events_owner_select on public.marketing_events for select to authenticated
using (campaign_id is not null and exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=(select auth.uid()) or (select public.is_admin()))));

drop policy if exists marketing_events_auth_insert on public.marketing_events;
create policy marketing_events_auth_insert on public.marketing_events for insert to authenticated
with check (actor_id is null or actor_id=(select auth.uid()));

drop policy if exists marketing_daily_metrics_owner_all on public.marketing_daily_metrics;
create policy marketing_daily_metrics_owner_all on public.marketing_daily_metrics for all to authenticated
using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=(select auth.uid()) or (select public.is_admin()))))
with check (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=(select auth.uid()) or (select public.is_admin()))));

grant select,insert,update,delete on public.marketing_campaigns,public.marketing_audiences,public.marketing_ad_sets,public.marketing_creatives,public.marketing_ads,public.marketing_daily_metrics to authenticated;
grant select,insert on public.marketing_events to authenticated;

alter table public.chat_live_rooms drop constraint if exists chat_live_rooms_status_check;
alter table public.chat_live_rooms add constraint chat_live_rooms_status_check check(status in ('scheduled','live','ended','cancelled'));
alter table public.chat_live_rooms add column if not exists description text default '';
alter table public.chat_live_rooms add column if not exists cover_media jsonb not null default '[]'::jsonb;
alter table public.chat_live_rooms add column if not exists scheduled_at timestamptz;
alter table public.chat_live_rooms add column if not exists replay_url text;
alter table public.chat_live_rooms add column if not exists playback_url text;
alter table public.chat_live_rooms add column if not exists stream_provider text not null default 'external';
alter table public.chat_live_rooms add column if not exists viewer_peak integer not null default 0;
alter table public.chat_live_rooms add column if not exists likes_count bigint not null default 0;
alter table public.chat_live_rooms add column if not exists shares_count bigint not null default 0;
alter table public.chat_live_rooms add column if not exists settings jsonb not null default '{"q_and_a":true,"comments":true,"record_replay":true,"product_pinning":true,"moderation":true,"reactions":true,"guest_stage":true}'::jsonb;

create table if not exists public.chat_live_products (
  room_id uuid not null references public.chat_live_rooms(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position integer not null default 0,
  is_pinned boolean not null default false,
  pinned_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(room_id,product_id)
);

create table if not exists public.chat_live_moderators (
  room_id uuid not null references public.chat_live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permissions jsonb not null default '{"delete_comment":true,"mute_user":true,"block_user":true,"manage_products":true}'::jsonb,
  created_at timestamptz not null default now(),
  primary key(room_id,user_id)
);

create table if not exists public.chat_live_blocked_keywords (
  room_id uuid not null references public.chat_live_rooms(id) on delete cascade,
  keyword text not null check (char_length(trim(keyword)) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key(room_id,keyword)
);

create table if not exists public.chat_live_reactions (
  room_id uuid not null references public.chat_live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (char_length(reaction) between 1 and 32),
  created_at timestamptz not null default now(),
  primary key(room_id,user_id,reaction)
);

create table if not exists public.chat_live_giveaways (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_live_rooms(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 160),
  status text not null default 'draft' check (status in ('draft','active','drawn','cancelled')),
  config jsonb not null default '{"entries":"active_viewers"}'::jsonb,
  winner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  drawn_at timestamptz
);

create index if not exists marketing_campaigns_owner_idx on public.marketing_campaigns(owner_id,created_at desc);
create index if not exists marketing_campaigns_status_idx on public.marketing_campaigns(status,start_at);
create index if not exists marketing_ad_sets_campaign_idx on public.marketing_ad_sets(campaign_id,created_at desc);
create index if not exists marketing_ad_sets_audience_idx on public.marketing_ad_sets(audience_id);
create index if not exists marketing_creatives_ad_set_idx on public.marketing_creatives(ad_set_id,created_at desc);
create index if not exists marketing_creatives_product_idx on public.marketing_creatives(product_id);
create index if not exists marketing_ads_ad_set_idx on public.marketing_ads(ad_set_id,created_at desc);
create index if not exists marketing_ads_creative_idx on public.marketing_ads(creative_id);
create index if not exists marketing_events_campaign_idx on public.marketing_events(campaign_id,created_at desc);
create index if not exists marketing_events_ad_idx on public.marketing_events(ad_id);
create index if not exists marketing_events_actor_idx on public.marketing_events(actor_id);
create index if not exists marketing_events_operation_idx on public.marketing_events(operation_id,created_at desc);
create index if not exists marketing_daily_metrics_campaign_idx on public.marketing_daily_metrics(campaign_id,metric_date desc);
create index if not exists marketing_campaigns_live_room_idx on public.marketing_campaigns(live_room_id);
create index if not exists marketing_campaigns_product_idx on public.marketing_campaigns(product_id);
create index if not exists chat_live_products_product_idx on public.chat_live_products(product_id);
create index if not exists chat_live_moderators_user_idx on public.chat_live_moderators(user_id);
create index if not exists chat_live_giveaways_winner_idx on public.chat_live_giveaways(winner_user_id);
create index if not exists chat_live_reactions_user_idx on public.chat_live_reactions(user_id);

alter table public.chat_live_products enable row level security;
alter table public.chat_live_moderators enable row level security;
alter table public.chat_live_blocked_keywords enable row level security;
alter table public.chat_live_reactions enable row level security;
alter table public.chat_live_giveaways enable row level security;

drop policy if exists chat_live_products_member_select on public.chat_live_products;
create policy chat_live_products_member_select on public.chat_live_products for select to authenticated
using (exists(select 1 from public.chat_live_rooms r where r.id=room_id and (r.status='live' or r.host_user_id=(select auth.uid()))));

drop policy if exists chat_live_products_host_write on public.chat_live_products;
drop policy if exists chat_live_products_host_update_delete on public.chat_live_products;
drop policy if exists chat_live_products_host_delete on public.chat_live_products;

create policy chat_live_products_host_write on public.chat_live_products for insert to authenticated
with check (exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.host_user_id=(select auth.uid())));
create policy chat_live_products_host_update_delete on public.chat_live_products for update to authenticated
using (exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.host_user_id=(select auth.uid())))
with check (exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.host_user_id=(select auth.uid())));
create policy chat_live_products_host_delete on public.chat_live_products for delete to authenticated
using (exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.host_user_id=(select auth.uid())));

drop policy if exists chat_live_moderators_host_manage on public.chat_live_moderators;
create policy chat_live_moderators_host_manage on public.chat_live_moderators for all to authenticated
using (exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.host_user_id=(select auth.uid())))
with check (exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.host_user_id=(select auth.uid())));

drop policy if exists chat_live_blocked_keywords_host_manage on public.chat_live_blocked_keywords;
create policy chat_live_blocked_keywords_host_manage on public.chat_live_blocked_keywords for all to authenticated
using (exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.host_user_id=(select auth.uid())))
with check (exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.host_user_id=(select auth.uid())));

drop policy if exists chat_live_reactions_live_member on public.chat_live_reactions;
create policy chat_live_reactions_live_member on public.chat_live_reactions for all to authenticated
using (user_id=(select auth.uid()) and exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.status='live'))
with check (user_id=(select auth.uid()) and exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.status='live'));

drop policy if exists chat_live_giveaways_host_manage on public.chat_live_giveaways;
create policy chat_live_giveaways_host_manage on public.chat_live_giveaways for all to authenticated
using (exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.host_user_id=(select auth.uid())))
with check (exists(select 1 from public.chat_live_rooms r where r.id=room_id and r.host_user_id=(select auth.uid())));

grant select,insert,update,delete on public.chat_live_products,public.chat_live_moderators,public.chat_live_blocked_keywords,public.chat_live_reactions,public.chat_live_giveaways to authenticated;

alter table public.advertisements add column if not exists campaign_id uuid references public.marketing_campaigns(id) on delete set null;
alter table public.advertisements add column if not exists objective text not null default 'sales';
alter table public.advertisements add column if not exists audience_config jsonb not null default '{}'::jsonb;
alter table public.advertisements add column if not exists placement_config jsonb not null default '{}'::jsonb;
alter table public.advertisements add column if not exists optimization_goal text not null default 'conversions';
create index if not exists idx_ads_campaign on public.advertisements(campaign_id,created_at desc);

commit;
