-- Repair migration for Phase 3 runtime access.
-- The base Phase 3 migration intentionally revokes broad grants; this migration
-- grants only the minimum access needed by authenticated product flows.

drop policy if exists credi_credit_profiles_self on public.credi_credit_profiles;
create policy credi_credit_profiles_self on public.credi_credit_profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists credi_credit_profiles_upsert_self on public.credi_credit_profiles;
create policy credi_credit_profiles_upsert_self on public.credi_credit_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy credi_credit_profiles_update_self on public.credi_credit_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists credi_credit_features_self on public.credi_credit_features;
create policy credi_credit_features_self on public.credi_credit_features for select to authenticated using (auth.uid() = user_id);
create policy credi_credit_features_insert_self on public.credi_credit_features for insert to authenticated with check (auth.uid() = user_id);

create policy credi_ai_decisions_self_insert on public.credi_ai_decisions for insert to authenticated with check (auth.uid() = user_id);

create policy credi_live_sessions_public_read on public.credi_live_sessions for select to anon, authenticated using (status in ('scheduled','live','ended'));
create policy credi_live_sessions_owner_insert on public.credi_live_sessions for insert to authenticated with check (auth.uid() = host_user_id);
create policy credi_live_sessions_owner_update on public.credi_live_sessions for update to authenticated using (auth.uid() = host_user_id) with check (auth.uid() = host_user_id);

grant select, insert on public.credi_ai_decisions to authenticated;
grant select, insert, update on public.credi_credit_profiles to authenticated;
grant select, insert on public.credi_credit_features to authenticated;
grant select, insert, update on public.credi_live_sessions to authenticated;
grant select on public.credi_live_sessions to anon;
grant select, insert, update on public.credi_live_products to authenticated;
grant select on public.credi_live_products to anon;
grant insert on public.credi_live_events to anon, authenticated;
grant select, insert on public.credi_reputation_events to authenticated;
grant select on public.credi_reputation_profiles to authenticated;
