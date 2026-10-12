-- Twilio outbound SMS audit and delivery tracking.
-- Private server-side tables only; application traffic uses the Supabase service client.
create table if not exists public.twilio_sms_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  message_sid text unique,
  status text not null default 'requested'
    check (status in ('requested','queued','accepted','sending','sent','delivered','undelivered','failed')),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index if not exists twilio_sms_requests_user_created_idx
  on public.twilio_sms_requests(user_id, created_at desc);

create table if not exists public.twilio_message_status_events (
  id bigint generated always as identity primary key,
  message_sid text not null,
  event_key text not null unique,
  message_status text not null
    check (message_status in ('accepted','queued','sending','sent','delivered','undelivered','failed','canceled','read')),
  error_code text,
  received_at timestamptz not null default now()
);
create index if not exists twilio_message_status_events_sid_received_idx
  on public.twilio_message_status_events(message_sid, received_at desc);

alter table public.twilio_sms_requests enable row level security;
alter table public.twilio_message_status_events enable row level security;
revoke all on table public.twilio_sms_requests from public, anon, authenticated;
revoke all on table public.twilio_message_status_events from public, anon, authenticated;
grant all on table public.twilio_sms_requests to service_role;
grant all on table public.twilio_message_status_events to service_role;
revoke all on sequence public.twilio_message_status_events_id_seq from public, anon, authenticated;
grant usage, select on sequence public.twilio_message_status_events_id_seq to service_role;
