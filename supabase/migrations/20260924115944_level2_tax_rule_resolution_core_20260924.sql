
create schema if not exists private;

create or replace function private.resolve_tax_rule(
  p_jurisdiction_code text,
  p_category_code text,
  p_at timestamptz default now()
)
returns table(
  rule_id uuid,
  rate_id uuid,
  jurisdiction_id uuid,
  tax_category_id uuid,
  rule_code text,
  taxpayer_role text,
  collection_role text,
  calculation_method text,
  rate numeric,
  rule_version text
)
language sql
security definer
set search_path=''
as $function$
  select
    r.id,
    r.rate_id,
    r.jurisdiction_id,
    r.tax_category_id,
    r.rule_code,
    r.taxpayer_role,
    r.collection_role,
    r.calculation_method,
    tr.rate,
    coalesce(r.rule_code,'UNVERSIONED')
  from public.tax_rules r
  join public.tax_jurisdictions j on j.id=r.jurisdiction_id
  join public.tax_categories c on c.id=r.tax_category_id
  join public.tax_rates tr on tr.id=r.rate_id
  where r.active=true
    and j.active=true
    and c.active=true
    and tr.active=true
    and upper(trim(j.jurisdiction_code))=upper(trim(p_jurisdiction_code))
    and upper(trim(c.code))=upper(trim(p_category_code))
    and p_at >= r.effective_from
    and (r.effective_to is null or p_at < r.effective_to)
    and p_at >= tr.effective_from
    and (tr.effective_to is null or p_at < tr.effective_to)
  order by r.priority desc, r.updated_at desc
  limit 1
$function$;

revoke all on function private.resolve_tax_rule(text,text,timestamptz) from public,anon,authenticated;

create or replace function private.tax_engine_status()
returns jsonb
language sql
security definer
set search_path=''
as $function$
  select jsonb_build_object(
    'engine_version','2.0.0',
    'configured_jurisdictions',(select count(*) from public.tax_jurisdictions where active=true and jurisdiction_code<>'NOT_CONFIGURED'),
    'configured_categories',(select count(*) from public.tax_categories where active=true),
    'configured_rates',(select count(*) from public.tax_rates where active=true),
    'configured_rules',(select count(*) from public.tax_rules where active=true),
    'mode',case
      when exists(select 1 from public.tax_rules where active=true)
       and exists(select 1 from public.tax_rates where active=true)
      then 'configured'
      else 'not_configured'
    end
  )
$function$;

revoke all on function private.tax_engine_status() from public,anon,authenticated;
