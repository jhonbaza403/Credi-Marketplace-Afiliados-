-- Security and performance hardening applied to the live Supabase project.
-- Remote migration version: 20260909002738

alter function public.set_compliance_updated_at() set search_path = '';

create index if not exists compliance_events_actor_idx
  on public.compliance_events(actor_id);

create index if not exists compliance_reviews_reviewer_idx
  on public.compliance_reviews(reviewer_id);

revoke all on table
  public.affiliate_commission_ledger,
  public.affiliate_products,
  public.idempotency_keys,
  public.inventory,
  public.webhook_events
from anon, authenticated;
