alter table public.webhook_events
  add column if not exists processing_started_at timestamptz;

create index if not exists idx_webhook_events_processing_started
  on public.webhook_events (status, processing_started_at)
  where status = 'processing';
