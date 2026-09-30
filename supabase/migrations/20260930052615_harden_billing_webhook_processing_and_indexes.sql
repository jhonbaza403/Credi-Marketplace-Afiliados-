-- Harden subscription webhook processing against duplicate and concurrent deliveries.
alter table public.subscription_events
  add column if not exists status text not null default 'received',
  add column if not exists processing_started_at timestamptz,
  add column if not exists processed_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists error_message text;

alter table public.subscription_events
  drop constraint if exists subscription_events_status_check;

alter table public.subscription_events
  add constraint subscription_events_status_check
  check (status in ('received','processing','processed','failed'));

create index if not exists idx_subscription_events_processing
  on public.subscription_events (status, processing_started_at)
  where status = 'processing';

drop index if exists public.billing_transactions_provider_tx_uniq;
