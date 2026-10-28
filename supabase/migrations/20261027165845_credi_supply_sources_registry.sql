begin;

create table if not exists public.credi_supply_sources (
  id uuid primary key default gen_random_uuid(),
  source_code text not null unique
    check (source_code ~ '^[A-Z0-9][A-Z0-9._-]{1,63}$'),
  provider_name text not null
    check (char_length(btrim(provider_name)) between 2 and 160),
  adapter_key text not null
    check (adapter_key ~ '^[a-z][a-z0-9._-]{1,63}$'),
  source_kind text not null
    check (source_kind in ('supplier_api', 'product_feed', 'webhook', 'manual', 'marketplace_api')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'suspended', 'disabled')),
  compliance_status text not null default 'pending'
    check (compliance_status in ('pending', 'approved', 'rejected', 'review_required')),
  supported_modes text[] not null default array['direct']::text[]
    check (cardinality(supported_modes) > 0),
  allowed_countries text[] not null default '{}'::text[],
  terms_url text
    check (terms_url is null or terms_url ~ '^https://'),
  credential_env_var text
    check (credential_env_var is null or credential_env_var ~ '^[A-Z][A-Z0-9_]{2,127}$'),
  adapter_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(adapter_config) = 'object'),
  attribution_policy jsonb not null default '{}'::jsonb
    check (jsonb_typeof(attribution_policy) = 'object'),
  last_synced_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credi_supply_sources_status_compliance_idx
  on public.credi_supply_sources (status, compliance_status, source_kind);

create index if not exists credi_supply_sources_modes_idx
  on public.credi_supply_sources using gin (supported_modes);

alter table public.credi_supply_sources enable row level security;

-- Provider credentials belong in server-only environment variables or a secret
-- manager. This table stores only the variable NAME, never its value.
revoke all on table public.credi_supply_sources from anon, authenticated;
grant select, insert, update, delete on table public.credi_supply_sources to service_role;

comment on table public.credi_supply_sources is
  'Credi-owned registry of authorized commercial supply sources. Provider integrations are adapters; Credi remains the catalog and transaction source of truth.';
comment on column public.credi_supply_sources.credential_env_var is
  'Name of a server-only environment variable that holds a provider credential. Never store the credential itself in PostgreSQL.';
comment on column public.credi_supply_sources.adapter_config is
  'Non-secret adapter configuration only. Never store API keys, tokens, passwords, or OAuth credentials here.';
comment on column public.credi_supply_sources.attribution_policy is
  'Versioned disclosure, attribution window, and commission ownership rules approved for this source.';

commit;
