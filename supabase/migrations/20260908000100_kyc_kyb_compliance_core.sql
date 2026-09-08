-- Credi Marketplace: KYC/KYB compliance core
-- Storage buckets are provisioned separately because the connected migration role
-- cannot modify storage.objects policies. The application uploads through a
-- server-only administrative client into private buckets.

create table if not exists public.kyc_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','pending','submitted','in_review','additional_information','approved','rejected','expired','suspended')),
  provider text,
  provider_case_id text,
  country char(2),
  document_type text,
  review_reason text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists kyc_cases_user_active_uniq on public.kyc_cases(user_id) where status not in ('rejected','expired');
create index if not exists kyc_cases_user_status_idx on public.kyc_cases(user_id,status);

create table if not exists public.kyb_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','pending','submitted','in_review','additional_information','approved','rejected','expired','suspended')),
  legal_name text,
  trade_name text,
  tax_id text,
  registration_number text,
  country char(2),
  legal_address text,
  business_activity text,
  provider text,
  provider_case_id text,
  review_reason text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists kyb_cases_user_active_uniq on public.kyb_cases(user_id) where status not in ('rejected','expired');
create index if not exists kyb_cases_user_status_idx on public.kyb_cases(user_id,status);

create table if not exists public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.kyc_cases(id) on delete cascade,
  document_type text not null check (document_type in ('id_front','id_back','passport','drivers_license','selfie','address_proof','other')),
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  checksum text,
  provider_document_id text,
  created_at timestamptz not null default now()
);
create index if not exists kyc_documents_case_idx on public.kyc_documents(case_id);

create table if not exists public.kyb_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.kyb_cases(id) on delete cascade,
  document_type text not null check (document_type in ('incorporation','bylaws','tax_certificate','registry_extract','proof_of_address','other')),
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  checksum text,
  provider_document_id text,
  created_at timestamptz not null default now()
);
create index if not exists kyb_documents_case_idx on public.kyb_documents(case_id);

create table if not exists public.kyb_ubo (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.kyb_cases(id) on delete cascade,
  full_name text not null,
  ownership_percent numeric(5,2) check (ownership_percent >= 0 and ownership_percent <= 100),
  role_title text,
  country char(2),
  created_at timestamptz not null default now()
);
create index if not exists kyb_ubo_case_idx on public.kyb_ubo(case_id);

create table if not exists public.compliance_checks (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('kyc','kyb')),
  subject_id uuid not null,
  check_type text not null check (check_type in ('identity','document','liveness','aml','pep','sanctions','business_registry','ubo','risk')),
  provider text,
  provider_check_id text,
  status text not null default 'pending' check (status in ('pending','passed','failed','needs_review','unavailable')),
  score numeric(7,2),
  result jsonb not null default '{}'::jsonb,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists compliance_checks_subject_idx on public.compliance_checks(subject_type,subject_id);

create table if not exists public.compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('kyc','kyb')),
  subject_id uuid not null,
  reviewer_id uuid not null references public.profiles(id),
  decision text not null check (decision in ('approved','rejected','additional_information','suspended')),
  reason text not null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists compliance_reviews_subject_idx on public.compliance_reviews(subject_type,subject_id,created_at desc);

create table if not exists public.compliance_events (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('kyc','kyb')),
  subject_id uuid not null,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  previous_status text,
  new_status text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists compliance_events_subject_idx on public.compliance_events(subject_type,subject_id,created_at desc);

create or replace function public.set_compliance_updated_at()
returns trigger
language plpgsql
as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_kyc_cases_updated_at on public.kyc_cases;
create trigger trg_kyc_cases_updated_at before update on public.kyc_cases for each row execute function public.set_compliance_updated_at();
drop trigger if exists trg_kyb_cases_updated_at on public.kyb_cases;
create trigger trg_kyb_cases_updated_at before update on public.kyb_cases for each row execute function public.set_compliance_updated_at();

alter table public.kyc_cases enable row level security;
alter table public.kyb_cases enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.kyb_documents enable row level security;
alter table public.kyb_ubo enable row level security;
alter table public.compliance_checks enable row level security;
alter table public.compliance_reviews enable row level security;
alter table public.compliance_events enable row level security;

revoke all on public.kyc_cases, public.kyb_cases, public.kyc_documents, public.kyb_documents, public.kyb_ubo, public.compliance_checks, public.compliance_reviews, public.compliance_events from anon;
grant select,insert,update on public.kyc_cases, public.kyb_cases to authenticated;
grant select,insert on public.kyc_documents, public.kyb_documents, public.kyb_ubo to authenticated;
grant select on public.compliance_checks, public.compliance_reviews, public.compliance_events to authenticated;

-- Cases: owners can manage their own data; admins can review cases.
drop policy if exists kyc_cases_self_select on public.kyc_cases;
create policy kyc_cases_self_select on public.kyc_cases for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists kyc_cases_self_insert on public.kyc_cases;
create policy kyc_cases_self_insert on public.kyc_cases for insert to authenticated with check (user_id = auth.uid());
drop policy if exists kyc_cases_self_update on public.kyc_cases;
create policy kyc_cases_self_update on public.kyc_cases for update to authenticated using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists kyb_cases_self_select on public.kyb_cases;
create policy kyb_cases_self_select on public.kyb_cases for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists kyb_cases_self_insert on public.kyb_cases;
create policy kyb_cases_self_insert on public.kyb_cases for insert to authenticated with check (user_id = auth.uid());
drop policy if exists kyb_cases_self_update on public.kyb_cases;
create policy kyb_cases_self_update on public.kyb_cases for update to authenticated using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists kyc_docs_owner_select on public.kyc_documents;
create policy kyc_docs_owner_select on public.kyc_documents for select to authenticated using (exists (select 1 from public.kyc_cases c where c.id=case_id and (c.user_id=auth.uid() or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))));
drop policy if exists kyc_docs_owner_insert on public.kyc_documents;
create policy kyc_docs_owner_insert on public.kyc_documents for insert to authenticated with check (exists (select 1 from public.kyc_cases c where c.id=case_id and c.user_id=auth.uid()));

drop policy if exists kyb_docs_owner_select on public.kyb_documents;
create policy kyb_docs_owner_select on public.kyb_documents for select to authenticated using (exists (select 1 from public.kyb_cases c where c.id=case_id and (c.user_id=auth.uid() or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))));
drop policy if exists kyb_docs_owner_insert on public.kyb_documents;
create policy kyb_docs_owner_insert on public.kyb_documents for insert to authenticated with check (exists (select 1 from public.kyb_cases c where c.id=case_id and c.user_id=auth.uid()));

drop policy if exists kyb_ubo_owner_select on public.kyb_ubo;
create policy kyb_ubo_owner_select on public.kyb_ubo for select to authenticated using (exists (select 1 from public.kyb_cases c where c.id=case_id and (c.user_id=auth.uid() or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))));
drop policy if exists kyb_ubo_owner_insert on public.kyb_ubo;
create policy kyb_ubo_owner_insert on public.kyb_ubo for insert to authenticated with check (exists (select 1 from public.kyb_cases c where c.id=case_id and c.user_id=auth.uid()));

drop policy if exists compliance_checks_self_select on public.compliance_checks;
create policy compliance_checks_self_select on public.compliance_checks for select to authenticated using ((subject_type='kyc' and exists (select 1 from public.kyc_cases c where c.id=subject_id and c.user_id=auth.uid())) or (subject_type='kyb' and exists (select 1 from public.kyb_cases c where c.id=subject_id and c.user_id=auth.uid())) or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists compliance_reviews_admin_select on public.compliance_reviews;
create policy compliance_reviews_admin_select on public.compliance_reviews for select to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists compliance_events_self_select on public.compliance_events;
create policy compliance_events_self_select on public.compliance_events for select to authenticated using ((subject_type='kyc' and exists (select 1 from public.kyc_cases c where c.id=subject_id and c.user_id=auth.uid())) or (subject_type='kyb' and exists (select 1 from public.kyb_cases c where c.id=subject_id and c.user_id=auth.uid())) or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
