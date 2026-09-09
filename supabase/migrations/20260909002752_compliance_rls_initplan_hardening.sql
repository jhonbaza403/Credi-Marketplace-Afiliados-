-- Compliance RLS performance hardening applied to live Supabase.
-- Remote migration version: 20260909002752

begin;

drop policy if exists kyc_cases_self_select on public.kyc_cases;
create policy kyc_cases_self_select on public.kyc_cases
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

drop policy if exists kyc_cases_self_insert on public.kyc_cases;
create policy kyc_cases_self_insert on public.kyc_cases
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists kyc_cases_self_update on public.kyc_cases;
create policy kyc_cases_self_update on public.kyc_cases
for update to authenticated
using (
  user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
)
with check (
  user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

drop policy if exists kyb_cases_self_select on public.kyb_cases;
create policy kyb_cases_self_select on public.kyb_cases
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

drop policy if exists kyb_cases_self_insert on public.kyb_cases;
create policy kyb_cases_self_insert on public.kyb_cases
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists kyb_cases_self_update on public.kyb_cases;
create policy kyb_cases_self_update on public.kyb_cases
for update to authenticated
using (
  user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
)
with check (
  user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

drop policy if exists kyc_docs_owner_select on public.kyc_documents;
create policy kyc_docs_owner_select on public.kyc_documents
for select to authenticated
using (
  exists (
    select 1 from public.kyc_cases c
    where c.id = kyc_documents.case_id
      and (
        c.user_id = (select auth.uid())
        or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
      )
  )
);

drop policy if exists kyc_docs_owner_insert on public.kyc_documents;
create policy kyc_docs_owner_insert on public.kyc_documents
for insert to authenticated
with check (
  exists (
    select 1 from public.kyc_cases c
    where c.id = kyc_documents.case_id and c.user_id = (select auth.uid())
  )
);

drop policy if exists kyb_docs_owner_select on public.kyb_documents;
create policy kyb_docs_owner_select on public.kyb_documents
for select to authenticated
using (
  exists (
    select 1 from public.kyb_cases c
    where c.id = kyb_documents.case_id
      and (
        c.user_id = (select auth.uid())
        or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
      )
  )
);

drop policy if exists kyb_docs_owner_insert on public.kyb_documents;
create policy kyb_docs_owner_insert on public.kyb_documents
for insert to authenticated
with check (
  exists (
    select 1 from public.kyb_cases c
    where c.id = kyb_documents.case_id and c.user_id = (select auth.uid())
  )
);

drop policy if exists kyb_ubo_owner_select on public.kyb_ubo;
create policy kyb_ubo_owner_select on public.kyb_ubo
for select to authenticated
using (
  exists (
    select 1 from public.kyb_cases c
    where c.id = kyb_ubo.case_id
      and (
        c.user_id = (select auth.uid())
        or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
      )
  )
);

drop policy if exists kyb_ubo_owner_insert on public.kyb_ubo;
create policy kyb_ubo_owner_insert on public.kyb_ubo
for insert to authenticated
with check (
  exists (
    select 1 from public.kyb_cases c
    where c.id = kyb_ubo.case_id and c.user_id = (select auth.uid())
  )
);

drop policy if exists compliance_checks_self_select on public.compliance_checks;
create policy compliance_checks_self_select on public.compliance_checks
for select to authenticated
using (
  (
    subject_type = 'kyc'
    and exists (
      select 1 from public.kyc_cases c
      where c.id = compliance_checks.subject_id and c.user_id = (select auth.uid())
    )
  )
  or (
    subject_type = 'kyb'
    and exists (
      select 1 from public.kyb_cases c
      where c.id = compliance_checks.subject_id and c.user_id = (select auth.uid())
    )
  )
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

drop policy if exists compliance_reviews_admin_select on public.compliance_reviews;
create policy compliance_reviews_admin_select on public.compliance_reviews
for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

drop policy if exists compliance_events_self_select on public.compliance_events;
create policy compliance_events_self_select on public.compliance_events
for select to authenticated
using (
  (
    subject_type = 'kyc'
    and exists (
      select 1 from public.kyc_cases c
      where c.id = compliance_events.subject_id and c.user_id = (select auth.uid())
    )
  )
  or (
    subject_type = 'kyb'
    and exists (
      select 1 from public.kyb_cases c
      where c.id = compliance_events.subject_id and c.user_id = (select auth.uid())
    )
  )
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

commit;
