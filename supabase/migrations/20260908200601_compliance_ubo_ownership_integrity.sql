-- Reconciled filename for the migration already recorded remotely as version 20260908200601.
-- Original migration content is intentionally preserved so local history matches
-- the remote migration version without re-executing the schema change.

create or replace function public.validate_kyb_ubo_ownership_sum()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_case uuid;
  ownership_total numeric;
begin
  target_case := coalesce(new.case_id, old.case_id);

  select coalesce(sum(coalesce(ownership_percent, 0)), 0)
    into ownership_total
    from public.kyb_ubo
   where case_id = target_case;

  if ownership_total > 100 then
    raise exception 'La participación total de UBO no puede superar 100%%';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_validate_kyb_ubo_ownership on public.kyb_ubo;

create constraint trigger trg_validate_kyb_ubo_ownership
after insert or update or delete on public.kyb_ubo
deferrable initially deferred
for each row
execute function public.validate_kyb_ubo_ownership_sum();
