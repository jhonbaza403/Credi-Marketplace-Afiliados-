create policy "credi intelligence modules authenticated read"
  on public.credi_intelligence_modules
  for select
  to authenticated
  using (true);

create policy "credi intelligence events client deny"
  on public.credi_intelligence_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "credi intelligence decisions client deny"
  on public.credi_intelligence_decisions
  for all
  to anon, authenticated
  using (false)
  with check (false);
