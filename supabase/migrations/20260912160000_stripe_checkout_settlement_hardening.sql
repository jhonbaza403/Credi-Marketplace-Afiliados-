-- Stripe checkout settlement hardening
-- Keeps provider references unique and improves webhook/payment lookup paths.

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_orchestrations_stripe_reference
ON public.payment_orchestrations(provider, provider_reference)
WHERE provider = 'stripe' AND provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_orchestrations_status_created
ON public.payment_orchestrations(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_status
ON public.webhook_events(provider, status, received_at DESC);
