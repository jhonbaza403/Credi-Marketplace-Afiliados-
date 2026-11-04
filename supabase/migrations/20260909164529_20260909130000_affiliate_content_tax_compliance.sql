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

-- Restore the base listing relation before its moderation/video extension.
-- The repository had this ALTER TABLE but no creation migration; the DDL below
-- is reconstructed from the production PostgreSQL catalog (read-only snapshot).
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  listing_type text NOT NULL DEFAULT 'product',
  status text NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  description text NOT NULL,
  category_slug text NOT NULL,
  subcategory_slug text,
  condition text NOT NULL DEFAULT 'new',
  price_amount numeric(20,4),
  currency char(3) NOT NULL DEFAULT 'USD',
  quantity numeric(20,4) NOT NULL DEFAULT 1,
  location_country char(2),
  location_region text,
  location_city text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  shipping_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  service_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listings_condition_valid
    CHECK (condition IN ('new','used','refurbished','open_box','not_applicable')),
  CONSTRAINT listings_currency_valid
    CHECK (currency ~ '^[A-Z]{3}
create index if not exists feed_posts_moderation_idx on public.feed_posts(status, moderation_status, published_at desc);
create index if not exists stories_moderation_idx on public.stories(visibility, moderation_status, expires_at desc);
create index if not exists reels_moderation_idx on public.reels(status, moderation_status, published_at desc);
create index if not exists advertisements_moderation_idx on public.advertisements(status, moderation_status, starts_at desc);
create index if not exists listings_moderation_idx on public.listings(status, moderation_status, published_at desc);

commit;
),
  CONSTRAINT listings_dates_valid
    CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at > published_at),
  CONSTRAINT listings_price_valid
    CHECK (price_amount IS NULL OR price_amount >= 0),
  CONSTRAINT listings_quantity_valid
    CHECK (quantity > 0),
  CONSTRAINT listings_status_valid
    CHECK (status IN ('draft','pending_review','published','paused','sold','expired','rejected','archived')),
  CONSTRAINT listings_type_valid
    CHECK (listing_type IN ('product','service','property','vehicle','classified'))
);

CREATE INDEX IF NOT EXISTS idx_listings_category_status
  ON public.listings(category_slug, status);
CREATE INDEX IF NOT EXISTS idx_listings_published_at
  ON public.listings(published_at DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_listings_seller_status
  ON public.listings(seller_id, status);

CREATE OR REPLACE FUNCTION public.set_listings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON public.listings;
CREATE TRIGGER trg_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.set_listings_updated_at();

alter table public.listings
  add column if not exists video_media jsonb not null default '[]'::jsonb,
  add column if not exists compliance_country char(2),
  add column if not exists moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected','blocked'));

-- Client-owned listings must not be able to self-approve or alter moderation.
-- Trusted moderation runs through service_role or an authorized administrator.
CREATE OR REPLACE FUNCTION public.guard_listing_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF coalesce(auth.role(), '') = 'authenticated'
     AND NOT coalesce(public.is_admin(), false) THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.moderation_status <> 'pending' THEN
        RAISE EXCEPTION 'Authenticated users cannot set listing moderation status'
          USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
      RAISE EXCEPTION 'Authenticated users cannot change listing moderation status'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$;

REVOKE ALL ON FUNCTION public.guard_listing_moderation_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_listing_moderation_fields() FROM anon;
REVOKE ALL ON FUNCTION public.guard_listing_moderation_fields() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.guard_listing_moderation_fields() TO service_role;

DROP TRIGGER IF EXISTS trg_guard_listing_moderation_fields ON public.listings;
CREATE TRIGGER trg_guard_listing_moderation_fields
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.guard_listing_moderation_fields();

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listings_select_visible_or_own ON public.listings;
CREATE POLICY listings_select_visible_or_own
ON public.listings FOR SELECT TO anon, authenticated
USING (
  (status = 'published' AND moderation_status = 'approved')
  OR seller_id = (SELECT auth.uid())
  OR (SELECT is_admin())
);

DROP POLICY IF EXISTS listings_owner_insert ON public.listings;
CREATE POLICY listings_owner_insert
ON public.listings FOR INSERT TO authenticated
WITH CHECK (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS listings_owner_update ON public.listings;
CREATE POLICY listings_owner_update
ON public.listings FOR UPDATE TO authenticated
USING (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()))
WITH CHECK (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()));

DROP POLICY IF EXISTS listings_owner_delete ON public.listings;
CREATE POLICY listings_owner_delete
ON public.listings FOR DELETE TO authenticated
USING (seller_id = (SELECT auth.uid()) OR (SELECT is_admin()));

REVOKE ALL PRIVILEGES ON TABLE public.listings FROM anon;
GRANT SELECT ON TABLE public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.listings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.listings TO service_role;

create index if not exists feed_posts_moderation_idx on public.feed_posts(status, moderation_status, published_at desc);
create index if not exists stories_moderation_idx on public.stories(visibility, moderation_status, expires_at desc);
create index if not exists reels_moderation_idx on public.reels(status, moderation_status, published_at desc);
create index if not exists advertisements_moderation_idx on public.advertisements(status, moderation_status, starts_at desc);
create index if not exists listings_moderation_idx on public.listings(status, moderation_status, published_at desc);

commit;
