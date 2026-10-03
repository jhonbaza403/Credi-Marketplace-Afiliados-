begin;

-- Affiliate enrollment: one affiliate relationship per Auth user.
create table if not exists public.affiliate_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  country char(2) not null,
  legal_name text not null,
  display_name text,
  email text not null,
  phone text,
  website_url text,
  social_profiles jsonb not null default '{}'::jsonb,
  promotion_methods text[] not null default '{}',
  tax_residency_country char(2),
  tax_id text,
  terms_version text not null,
  privacy_version text not null,
  affiliate_policy_version text not null,
  disclosures_accepted boolean not null default false,
  consent_at timestamptz,
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended','withdrawn')),
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affiliate_applications_consent_required check (disclosures_accepted = true and consent_at is not null),
  constraint affiliate_applications_country check (country ~ '^[A-Z]{2}$')
);

create unique index if not exists affiliate_applications_one_active_per_user
  on public.affiliate_applications(user_id)
  where status in ('pending','approved','suspended');

alter table public.affiliate_applications enable row level security;

drop policy if exists "affiliate_application_owner_select" on public.affiliate_applications;
create policy "affiliate_application_owner_select"
  on public.affiliate_applications for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "affiliate_application_owner_insert" on public.affiliate_applications;
create policy "affiliate_application_owner_insert"
  on public.affiliate_applications for insert to authenticated
  with check ((select auth.uid()) = user_id and not exists (select 1 from public.affiliates a where a.user_id = (select auth.uid())));

drop policy if exists "affiliate_application_owner_update" on public.affiliate_applications;
create policy "affiliate_application_owner_update"
  on public.affiliate_applications for update to authenticated
  using ((select auth.uid()) = user_id and status in ('pending','rejected'))
  with check ((select auth.uid()) = user_id);

-- Ensure a user cannot hold multiple affiliate accounts.
create unique index if not exists affiliates_one_account_per_user on public.affiliates(user_id);

-- Make product-level affiliate codes deterministic and unique per affiliate/product.
alter table public.affiliate_products
  add column if not exists referral_code text;

update public.affiliate_products ap
set referral_code = coalesce(nullif(ap.referral_code, ''), left(encode(gen_random_bytes(9), 'hex'), 18))
where ap.referral_code is null or ap.referral_code = '';

alter table public.affiliate_products
  alter column referral_code set not null;

create unique index if not exists affiliate_products_referral_code_uq
  on public.affiliate_products(referral_code);

create unique index if not exists affiliate_products_affiliate_product_uq
  on public.affiliate_products(affiliate_id, product_id);

-- Tax/compliance profile for payout reporting and jurisdiction-specific requirements.
create table if not exists public.affiliate_tax_profiles (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null unique references public.affiliates(id) on delete cascade,
  country char(2) not null,
  tax_residency_country char(2),
  tax_id text,
  taxpayer_type text,
  legal_name text,
  legal_address text,
  withholding_rate numeric(7,4) not null default 0 check (withholding_rate >= 0 and withholding_rate <= 100),
  vat_registered boolean,
  vat_number text,
  status text not null default 'pending' check (status in ('pending','verified','needs_review','blocked')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affiliate_tax_profiles_country check (country ~ '^[A-Z]{2}$')
);

alter table public.affiliate_tax_profiles enable row level security;
drop policy if exists "affiliate_tax_profile_owner_select" on public.affiliate_tax_profiles;
create policy "affiliate_tax_profile_owner_select"
  on public.affiliate_tax_profiles for select to authenticated
  using (exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = (select auth.uid())));

drop policy if exists "affiliate_tax_profile_owner_insert" on public.affiliate_tax_profiles;
create policy "affiliate_tax_profile_owner_insert"
  on public.affiliate_tax_profiles for insert to authenticated
  with check (exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = (select auth.uid())));

drop policy if exists "affiliate_tax_profile_owner_update" on public.affiliate_tax_profiles;
create policy "affiliate_tax_profile_owner_update"
  on public.affiliate_tax_profiles for update to authenticated
  using (exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = (select auth.uid())));

-- Compliance evidence for affiliate policy acceptance and content advertising disclosures.
create table if not exists public.affiliate_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  country char(2) not null,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  constraint affiliate_policy_acceptances_country check (country ~ '^[A-Z]{2}$')
);

alter table public.affiliate_policy_acceptances enable row level security;
drop policy if exists "affiliate_policy_acceptance_owner_select" on public.affiliate_policy_acceptances;
create policy "affiliate_policy_acceptance_owner_select"
  on public.affiliate_policy_acceptances for select to authenticated
  using (exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = (select auth.uid())));

drop policy if exists "affiliate_policy_acceptance_owner_insert" on public.affiliate_policy_acceptances;
create policy "affiliate_policy_acceptance_owner_insert"
  on public.affiliate_policy_acceptances for insert to authenticated
  with check (exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = (select auth.uid())));

-- Extend marketplace content with explicit disclosure/moderation metadata.
alter table public.feed_posts
  add column if not exists is_sponsored boolean not null default false,
  add column if not exists affiliate_disclosure boolean not null default false,
  add column if not exists moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected','blocked'));

alter table public.stories
  add column if not exists is_sponsored boolean not null default false,
  add column if not exists affiliate_disclosure boolean not null default false,
  add column if not exists moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected','blocked'));

alter table public.reels
  add column if not exists is_sponsored boolean not null default false,
  add column if not exists affiliate_disclosure boolean not null default false,
  add column if not exists moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected','blocked'));

alter table public.advertisements
  add column if not exists disclosure_text text,
  add column if not exists moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected','blocked')),
  add column if not exists targeting_country char(2);

alter table public.listings
  add column if not exists video_media jsonb not null default '[]'::jsonb,
  add column if not exists compliance_country char(2),
  add column if not exists moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected','blocked'));

create index if not exists feed_posts_moderation_idx on public.feed_posts(status, moderation_status, published_at desc);
create index if not exists stories_moderation_idx on public.stories(visibility, moderation_status, expires_at desc);
create index if not exists reels_moderation_idx on public.reels(status, moderation_status, published_at desc);
create index if not exists advertisements_moderation_idx on public.advertisements(status, moderation_status, starts_at desc);
create index if not exists listings_moderation_idx on public.listings(status, moderation_status, published_at desc);

commit;
