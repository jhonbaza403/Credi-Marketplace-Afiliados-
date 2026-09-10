-- Credi Marketplace
-- MIGRATION 026: Billing invoice ledger integrity

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS billing_transactions_provider_tx_uniq
  ON public.billing_transactions(provider, provider_transaction_id)
  WHERE provider IS NOT NULL AND provider_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS billing_transactions_subscription_idx
  ON public.billing_transactions(subscription_id, created_at DESC);

COMMIT;
