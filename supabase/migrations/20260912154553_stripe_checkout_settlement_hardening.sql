create unique index if not exists ux_payment_orchestrations_stripe_reference on public.payment_orchestrations(provider, provider_reference) where provider = 'stripe' and provider_reference is not null;
create index if not exists idx_payment_orchestrations_status_created on public.payment_orchestrations(status, created_at desc);
create index if not exists idx_webhook_events_provider_status on public.webhook_events(provider, status, received_at desc);
