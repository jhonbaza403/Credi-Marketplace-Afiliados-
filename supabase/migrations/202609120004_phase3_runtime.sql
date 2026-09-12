alter table public.credi_escrows drop constraint if exists credi_escrows_status_check;
alter table public.credi_escrows add constraint credi_escrows_status_check check (status in ('pending','funded','shipping','delivered','disputed','released','refunded','cancelled'));

create index if not exists credi_escrows_release_idx on public.credi_escrows(status, release_after, dispute_deadline);
create index if not exists credi_smart_lockers_status_idx on public.credi_smart_lockers(status, capacity);
create index if not exists credi_live_sessions_status_idx on public.credi_live_sessions(status, created_at desc);
