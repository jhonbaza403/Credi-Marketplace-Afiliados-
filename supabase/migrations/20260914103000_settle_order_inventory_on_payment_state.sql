create or replace function public.settle_order_inventory(p_order_id uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
  v_available integer;
  v_reserved integer;
begin
  if p_order_id is null then raise exception 'order_required' using errcode='22023'; end if;
  if p_outcome not in ('paid','failed') then raise exception 'invalid_inventory_outcome' using errcode='22023'; end if;

  for r in
    select id, product_id, quantity
      from public.inventory_reservations
     where order_id = p_order_id
       and status = 'reserved'
     for update
  loop
    select available_quantity, reserved_quantity into v_available, v_reserved
      from public.inventory where product_id = r.product_id for update;

    if p_outcome = 'paid' then
      if v_reserved < r.quantity then raise exception 'inventory_reservation_mismatch' using errcode='23514'; end if;
      update public.inventory
         set reserved_quantity = reserved_quantity - r.quantity, updated_at = now()
       where product_id = r.product_id;
      update public.inventory_reservations
         set status = 'consumed', consumed_at = now()
       where id = r.id and status = 'reserved';
    else
      if v_reserved < r.quantity then raise exception 'inventory_reservation_mismatch' using errcode='23514'; end if;
      update public.inventory
         set available_quantity = available_quantity + r.quantity,
             reserved_quantity = reserved_quantity - r.quantity,
             updated_at = now()
       where product_id = r.product_id;
      update public.products
         set stock = stock + r.quantity, updated_at = now()
       where id = r.product_id;
      update public.inventory_reservations
         set status = case when expires_at is not null and expires_at <= now() then 'expired'::public.inventory_reservation_status else 'released'::public.inventory_reservation_status end,
             released_at = now()
       where id = r.id and status = 'reserved';
      insert into public.inventory_movements
        (product_id, order_id, reservation_id, movement_type, quantity, quantity_before, quantity_after, reason, created_by)
      values
        (r.product_id, p_order_id, r.id, 'release', r.quantity, v_available, v_available + r.quantity, 'Payment failed or checkout expired', null);
    end if;
  end loop;
end;
$$;

revoke all on function public.settle_order_inventory(uuid,text) from public;
grant execute on function public.settle_order_inventory(uuid,text) to service_role;
