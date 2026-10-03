alter table public.tax_transactions add column if not exists merchant_model text not null default 'marketplace_intermediary' check(merchant_model in('marketplace_intermediary','merchant_of_record','hybrid'));
alter table public.tax_transactions add column if not exists rule_version text;
alter table public.tax_transaction_lines add column if not exists merchant_model text not null default 'marketplace_intermediary' check(merchant_model in('marketplace_intermediary','merchant_of_record','hybrid'));
alter table public.tax_reports add column if not exists merchant_model text not null default 'marketplace_intermediary' check(merchant_model in('marketplace_intermediary','merchant_of_record','hybrid'));

drop policy if exists tax_jurisdictions_authenticated_read on public.tax_jurisdictions;
drop policy if exists tax_categories_authenticated_read on public.tax_categories;
drop policy if exists tax_rates_authenticated_read on public.tax_rates;
drop policy if exists tax_rules_authenticated_read on public.tax_rules;
drop policy if exists tax_transactions_participant_read on public.tax_transactions;
drop policy if exists tax_transaction_lines_participant_read on public.tax_transaction_lines;

alter table public.tax_jurisdictions enable row level security;
alter table public.tax_categories enable row level security;
alter table public.tax_rates enable row level security;
alter table public.tax_rules enable row level security;
alter table public.tax_transactions enable row level security;
alter table public.tax_transaction_lines enable row level security;
alter table public.tax_withholdings enable row level security;
alter table public.tax_collections enable row level security;
alter table public.tax_reports enable row level security;
alter table public.tax_filings enable row level security;
alter table public.tax_exemptions enable row level security;
alter table public.tax_certificates enable row level security;

create policy tax_jurisdictions_authenticated_read on public.tax_jurisdictions for select to authenticated using(active = true);
create policy tax_categories_authenticated_read on public.tax_categories for select to authenticated using(active = true);
create policy tax_rates_authenticated_read on public.tax_rates for select to authenticated using(active = true);
create policy tax_rules_authenticated_read on public.tax_rules for select to authenticated using(active = true);
create policy tax_transactions_participant_read on public.tax_transactions for select to authenticated using(auth.uid() = buyer_id or auth.uid() = seller_id or auth.uid() = affiliate_id or auth.uid() = provider_id);
create policy tax_transaction_lines_participant_read on public.tax_transaction_lines for select to authenticated using(exists(select 1 from public.tax_transactions t where t.id = tax_transaction_id and (auth.uid() = t.buyer_id or auth.uid() = t.seller_id or auth.uid() = t.affiliate_id or auth.uid() = t.provider_id)));
create policy tax_withholdings_payee_read on public.tax_withholdings for select to authenticated using(auth.uid() = payee_id);
create policy tax_certificates_owner_read on public.tax_certificates for select to authenticated using(auth.uid() = taxpayer_id);

comment on column public.tax_transactions.merchant_model is 'Commercial role for the transaction; does not by itself determine legal tax liability.';
comment on column public.tax_transactions.snapshot is 'Immutable fiscal snapshot: jurisdiction, rule, rates, parties, bases and calculation inputs as known at transaction time.';
