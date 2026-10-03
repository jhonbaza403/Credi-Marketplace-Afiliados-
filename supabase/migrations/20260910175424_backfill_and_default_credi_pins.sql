alter table public.profiles
  alter column credi_pin set default public.generate_credi_pin();

update public.profiles
set credi_pin = public.generate_credi_pin(), updated_at = now()
where credi_pin is null;
