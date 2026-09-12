create table if not exists public.credi_intelligence_modules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  purpose text not null,
  status text not null default 'active' check (status in ('active','planned','disabled')),
  version text not null default '1.0.0',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credi_intelligence_events (
  id uuid primary key default gen_random_uuid(),
  module_code text not null references public.credi_intelligence_modules(code) on update cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text,
  entity_id uuid,
  event_type text not null,
  input_hash text,
  outcome jsonb not null default '{}'::jsonb,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  model_version text,
  created_at timestamptz not null default now()
);

create table if not exists public.credi_intelligence_decisions (
  id uuid primary key default gen_random_uuid(),
  module_code text not null references public.credi_intelligence_modules(code) on update cascade,
  subject_type text not null,
  subject_id uuid,
  decision text not null,
  score numeric(12,6),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  rationale jsonb not null default '{}'::jsonb,
  model_version text,
  status text not null default 'active' check (status in ('active','superseded','revoked','under_review')),
  decided_at timestamptz not null default now(),
  review_due_at timestamptz
);

create index if not exists idx_credi_intelligence_events_module_created
  on public.credi_intelligence_events(module_code, created_at desc);
create index if not exists idx_credi_intelligence_events_entity
  on public.credi_intelligence_events(entity_type, entity_id, created_at desc);
create index if not exists idx_credi_intelligence_decisions_module_subject
  on public.credi_intelligence_decisions(module_code, subject_type, subject_id, decided_at desc);

alter table public.credi_intelligence_modules enable row level security;
alter table public.credi_intelligence_events enable row level security;
alter table public.credi_intelligence_decisions enable row level security;

insert into public.credi_intelligence_modules (code, name, purpose, config)
values
  ('CREDI-INTELLIGENCE', 'Credi Intelligence', 'Cerebro transversal de inteligencia, señales, decisiones y automatización de Credi Marketplace.', '{"role":"orchestrator"}'::jsonb),
  ('CREDI-CREDIT-AI', 'Credi-Credit AI', 'Evaluación y gestión inteligente de capacidad, riesgo y señales crediticias.', '{"data_policy":"minimize","human_review":true}'::jsonb),
  ('CREDI-SUPPLY-AI', 'Credi-Supply AI', 'Abastecimiento, incorporación de proveedores y selección inteligente de fuentes comerciales autorizadas.', '{"supported_modes":["direct","dropshipping","wholesale","supplier"]}'::jsonb),
  ('CREDI-CATALOG-AI', 'Credi-Catalog AI', 'Generación, normalización y optimización de fichas y catálogos.', '{"source_of_truth":"credi"}'::jsonb),
  ('CREDI-FLEX-AI', 'Credi-Flex AI', 'Inteligencia logística, promesas de entrega y asignación operativa.', '{"decision_scope":"fulfillment"}'::jsonb),
  ('CREDI-LOCKER', 'Credi-Locker', 'Orquestación de casilleros inteligentes y puntos de entrega autorizados.', '{"module_type":"infrastructure"}'::jsonb),
  ('CREDI-ESCROW', 'Credi-Escrow', 'Custodia y liberación controlada de fondos vinculada a eventos verificables.', '{"requires_server_authority":true}'::jsonb),
  ('CREDI-LIVE', 'Credi-Live', 'Comercio en vivo, sesiones y experiencias comerciales en tiempo real.', '{"module_type":"commerce"}'::jsonb),
  ('CREDI-AFFILIATE-AI', 'Credi-Affiliate AI', 'Atribución, elegibilidad, optimización y comisiones de afiliación.', '{"external_programs_separate":true}'::jsonb),
  ('CREDI-REPUTATION', 'Credi-Reputation', 'Reputación comercial, señales de confianza y comportamiento transaccional.', '{"source":"transactional"}'::jsonb),
  ('CREDI-AUTOMATION', 'Credi-Automation', 'Automatización, agentes y ejecución gobernada de tareas.', '{"requires_audit":true}'::jsonb)
on conflict (code) do update
set name = excluded.name,
    purpose = excluded.purpose,
    config = excluded.config,
    updated_at = now();
