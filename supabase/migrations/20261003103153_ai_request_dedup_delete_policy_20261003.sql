revoke delete on public.ai_request_dedup from anon;
grant delete on public.ai_request_dedup to authenticated;
drop policy if exists ai_request_dedup_owner_delete on public.ai_request_dedup;
create policy ai_request_dedup_owner_delete
  on public.ai_request_dedup for delete
  to authenticated
  using (user_id = auth.uid());