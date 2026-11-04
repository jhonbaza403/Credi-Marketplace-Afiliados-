-- Private server-written inboxes. RLS is enabled with no client policies.
create table if not exists public.communication_webhook_events (
 id uuid primary key default gen_random_uuid(),
 provider text not null check (provider in ('twilio')),
 provider_event_id text not null,
 event_type text not null,
 status text not null default 'received' check(status in ('received','processing','processed','failed')),
 payload jsonb not null default '{}'::jsonb,
 received_at timestamptz not null default now(),
 processed_at timestamptz,
 created_at timestamptz not null default now(),
 unique(provider,provider_event_id)
);
create table if not exists public.affiliate_webhook_events (
 id uuid primary key default gen_random_uuid(),
 provider_event_id text not null unique,
 event_type text not null,
 occurred_at timestamptz,
 payload jsonb not null default '{}'::jsonb,
 payload_sha256 text not null check(payload_sha256 ~ '^[a-f0-9]{64}$'),
 status text not null default 'received' check(status in ('received','processing','processed','failed')),
 received_at timestamptz not null default now(),
 processed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.communication_webhook_events enable row level security;
alter table public.affiliate_webhook_events enable row level security;
revoke all on table public.communication_webhook_events from anon, authenticated;
revoke all on table public.affiliate_webhook_events from anon, authenticated;
grant all on table public.communication_webhook_events to service_role;
grant all on table public.affiliate_webhook_events to service_role;
create index if not exists communication_webhook_events_status_received_idx on public.communication_webhook_events(status,received_at);
create index if not exists affiliate_webhook_events_status_received_idx on public.affiliate_webhook_events(status,received_at);
comment on table public.communication_webhook_events is 'Private idempotent inbox for verified Twilio callbacks; no client access.';
comment on table public.affiliate_webhook_events is 'Private inbox for signed normalized partner events; does not credit commissions.';
