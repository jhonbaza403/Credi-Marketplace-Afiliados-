alter table public.credi_escrows add constraint credi_escrows_amount_nonnegative check (amount >= 0);
alter table public.credi_locker_shipments add constraint credi_locker_order_nonempty check (order_id is not null);
