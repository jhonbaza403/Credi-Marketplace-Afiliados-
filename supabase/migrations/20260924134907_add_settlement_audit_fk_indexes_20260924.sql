
create index if not exists settlement_account_bindings_created_by_idx on public.settlement_account_bindings(created_by);
create index if not exists settlement_approval_audit_actor_idx on public.settlement_approval_audit(actor_id);
create index if not exists settlement_payout_audit_actor_idx on public.settlement_payout_audit(actor_id);
