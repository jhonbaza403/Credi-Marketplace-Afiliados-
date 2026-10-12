create index if not exists idx_ai_request_dedup_session_id
  on public.ai_request_dedup (session_id);

drop policy if exists ai_request_dedup_owner_select on public.ai_request_dedup;
create policy ai_request_dedup_owner_select
on public.ai_request_dedup
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists ai_request_dedup_owner_insert on public.ai_request_dedup;
create policy ai_request_dedup_owner_insert
on public.ai_request_dedup
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists ai_request_dedup_owner_update on public.ai_request_dedup;
create policy ai_request_dedup_owner_update
on public.ai_request_dedup
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists ai_request_dedup_owner_delete on public.ai_request_dedup;
create policy ai_request_dedup_owner_delete
on public.ai_request_dedup
for delete to authenticated
using (user_id = (select auth.uid()));
