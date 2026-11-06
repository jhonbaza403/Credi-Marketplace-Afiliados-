-- Credi professional network: jobs, applications and user-controlled profiles.
-- Feature-branch migration only. Reconcile the remote migration history and test
-- in a non-production environment before any production rollout.

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references auth.users(id) on delete cascade,
  company text not null check (char_length(trim(company)) between 2 and 150),
  title text not null check (char_length(trim(title)) between 3 and 150),
  description text not null check (char_length(trim(description)) between 30 and 5000),
  category text,
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time','part_time','contract','temporary','internship','freelance')),
  work_mode text not null default 'on_site'
    check (work_mode in ('remote','hybrid','on_site')),
  country text,
  location text,
  salary text,
  salary_min numeric(14,2) check (salary_min is null or salary_min >= 0),
  salary_max numeric(14,2) check (salary_max is null or salary_max >= 0),
  salary_currency char(3) not null default 'USD' check (salary_currency ~ '^[A-Z]{3}$'),
  status text not null default 'active' check (status in ('draft','active','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_salary_range_valid check (
    salary_min is null or salary_max is null or salary_min <= salary_max
  )
);

create index if not exists jobs_active_created_idx on public.jobs (created_at desc) where status = 'active';
create index if not exists jobs_employer_created_idx on public.jobs (employer_id, created_at desc);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references auth.users(id) on delete cascade,
  cover_letter text check (cover_letter is null or char_length(cover_letter) <= 5000),
  resume_path text,
  status text not null default 'pending' check (status in ('pending','reviewed','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_applications_one_per_candidate unique (job_id, candidate_id)
);

create index if not exists job_applications_candidate_created_idx on public.job_applications (candidate_id, created_at desc);
create index if not exists job_applications_job_status_idx on public.job_applications (job_id, status, created_at desc);

create table if not exists public.professional_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 150),
  headline text check (headline is null or char_length(headline) <= 180),
  summary text check (summary is null or char_length(summary) <= 5000),
  location text check (location is null or char_length(location) <= 180),
  skills text[] not null default '{}',
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  website_url text,
  portfolio_url text,
  visibility text not null default 'private' check (visibility in ('private','public')),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_credi_jobs_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists jobs_touch_updated_at on public.jobs;
create trigger jobs_touch_updated_at before update on public.jobs
for each row execute function public.touch_credi_jobs_updated_at();

drop trigger if exists job_applications_touch_updated_at on public.job_applications;
create trigger job_applications_touch_updated_at before update on public.job_applications
for each row execute function public.touch_credi_jobs_updated_at();

drop trigger if exists professional_profiles_touch_updated_at on public.professional_profiles;
create trigger professional_profiles_touch_updated_at before update on public.professional_profiles
for each row execute function public.touch_credi_jobs_updated_at();

alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.professional_profiles enable row level security;

drop policy if exists jobs_read_active_or_own on public.jobs;
create policy jobs_read_active_or_own on public.jobs for select to anon, authenticated
using (status = 'active' or employer_id = (select auth.uid()));

drop policy if exists jobs_insert_own on public.jobs;
create policy jobs_insert_own on public.jobs for insert to authenticated
with check (employer_id = (select auth.uid()));

drop policy if exists jobs_update_own on public.jobs;
create policy jobs_update_own on public.jobs for update to authenticated
using (employer_id = (select auth.uid()))
with check (employer_id = (select auth.uid()));

drop policy if exists jobs_delete_own on public.jobs;
create policy jobs_delete_own on public.jobs for delete to authenticated
using (employer_id = (select auth.uid()));

drop policy if exists job_applications_read_candidate_or_employer on public.job_applications;
create policy job_applications_read_candidate_or_employer on public.job_applications for select to authenticated
using (
  candidate_id = (select auth.uid())
  or exists (
    select 1 from public.jobs j
    where j.id = job_applications.job_id and j.employer_id = (select auth.uid())
  )
);

drop policy if exists job_applications_insert_candidate on public.job_applications;
create policy job_applications_insert_candidate on public.job_applications for insert to authenticated
with check (
  candidate_id = (select auth.uid())
  and exists (
    select 1 from public.jobs j
    where j.id = job_applications.job_id
      and j.status = 'active'
      and j.employer_id <> (select auth.uid())
  )
);

-- Authenticated users may not update application records directly. A future
-- employer review endpoint/RPC must expose a status-only transition.

drop policy if exists professional_profiles_read_visible_or_own on public.professional_profiles;
create policy professional_profiles_read_visible_or_own on public.professional_profiles for select to authenticated
using (visibility = 'public' or user_id = (select auth.uid()));

drop policy if exists professional_profiles_insert_own on public.professional_profiles;
create policy professional_profiles_insert_own on public.professional_profiles for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists professional_profiles_update_own on public.professional_profiles;
create policy professional_profiles_update_own on public.professional_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;
grant select, insert on public.job_applications to authenticated;
grant select, insert, update on public.professional_profiles to authenticated;
