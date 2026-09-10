create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct','group','business','support')),
  title text,
  created_by uuid not null references auth.users(id) on delete cascade,
  product_id uuid,
  order_id uuid,
  store_id uuid,
  b2b_product_id uuid,
  direct_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists conversations_direct_key_uq on public.conversations(direct_key) where kind='direct' and direct_key is not null;
create index if not exists conversations_updated_at_idx on public.conversations(updated_at desc);
create index if not exists conversations_product_idx on public.conversations(product_id) where product_id is not null;

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('member','admin','support')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted_until timestamptz,
  primary key (conversation_id,user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members(user_id,conversation_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'text' check (message_type in ('text','image','video','audio','document','file','link','system','quote','product','order')),
  body text,
  reply_to_id uuid references public.messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint messages_content_chk check (coalesce(length(trim(body)),0)>0 or metadata<>'{}'::jsonb)
);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at asc);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  public_url text,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes>=0),
  width integer,
  height integer,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists message_attachments_message_idx on public.message_attachments(message_id);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check(char_length(reaction) between 1 and 32),
  created_at timestamptz not null default now(),
  primary key(message_id,user_id,reaction)
);

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.conversation_products (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  product_id uuid not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(conversation_id,product_id)
);

create table if not exists public.conversation_orders (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  order_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(conversation_id,order_id)
);

create table if not exists public.conversation_quotes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  product_id uuid,
  quantity numeric(14,3) not null check(quantity>0),
  unit_price numeric(14,2) not null check(unit_price>=0),
  currency text not null default 'USD' check(char_length(currency)=3),
  subtotal numeric(14,2) generated always as(round(quantity*unit_price,2)) stored,
  moq numeric(14,3),
  delivery_estimate_days integer check(delivery_estimate_days is null or delivery_estimate_days>=0),
  terms text,
  status text not null default 'pending' check(status in ('pending','accepted','rejected','expired','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_credichat_updated_at()
returns trigger language plpgsql security definer set search_path=''
as $$ begin new.updated_at=now(); return new; end $$;

 drop trigger if exists conversations_touch_updated_at on public.conversations;
create trigger conversations_touch_updated_at before update on public.conversations for each row execute function public.touch_credichat_updated_at();
drop trigger if exists conversation_quotes_touch_updated_at on public.conversation_quotes;
create trigger conversation_quotes_touch_updated_at before update on public.conversation_quotes for each row execute function public.touch_credichat_updated_at();

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_reports enable row level security;
alter table public.conversation_products enable row level security;
alter table public.conversation_orders enable row level security;
alter table public.conversation_quotes enable row level security;

 drop policy if exists conversations_member_select on public.conversations;
create policy conversations_member_select on public.conversations for select to authenticated using(exists(select 1 from public.conversation_members cm where cm.conversation_id=conversations.id and cm.user_id=(select auth.uid())));
drop policy if exists conversations_member_insert on public.conversations;
create policy conversations_member_insert on public.conversations for insert to authenticated with check(created_by=(select auth.uid()));
drop policy if exists conversation_members_select on public.conversation_members;
create policy conversation_members_select on public.conversation_members for select to authenticated using(exists(select 1 from public.conversation_members own where own.conversation_id=conversation_members.conversation_id and own.user_id=(select auth.uid())));
drop policy if exists conversation_members_insert on public.conversation_members;
create policy conversation_members_insert on public.conversation_members for insert to authenticated with check(user_id=(select auth.uid()) or exists(select 1 from public.conversation_members own where own.conversation_id=conversation_members.conversation_id and own.user_id=(select auth.uid()) and own.member_role in ('admin','support')));

drop policy if exists messages_member_select on public.messages;
create policy messages_member_select on public.messages for select to authenticated using(exists(select 1 from public.conversation_members cm where cm.conversation_id=messages.conversation_id and cm.user_id=(select auth.uid())));
drop policy if exists messages_member_insert on public.messages;
create policy messages_member_insert on public.messages for insert to authenticated with check(sender_id=(select auth.uid()) and exists(select 1 from public.conversation_members cm where cm.conversation_id=messages.conversation_id and cm.user_id=(select auth.uid())));
drop policy if exists messages_sender_update on public.messages;
create policy messages_sender_update on public.messages for update to authenticated using(sender_id=(select auth.uid())) with check(sender_id=(select auth.uid()));

drop policy if exists message_attachments_member_select on public.message_attachments;
create policy message_attachments_member_select on public.message_attachments for select to authenticated using(exists(select 1 from public.messages m join public.conversation_members cm on cm.conversation_id=m.conversation_id where m.id=message_attachments.message_id and cm.user_id=(select auth.uid())));
drop policy if exists message_attachments_sender_insert on public.message_attachments;
create policy message_attachments_sender_insert on public.message_attachments for insert to authenticated with check(exists(select 1 from public.messages m where m.id=message_attachments.message_id and m.sender_id=(select auth.uid())));

drop policy if exists message_reactions_member_all on public.message_reactions;
create policy message_reactions_member_all on public.message_reactions for all to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.messages m join public.conversation_members cm on cm.conversation_id=m.conversation_id where m.id=message_reactions.message_id and cm.user_id=(select auth.uid()))) with check(user_id=(select auth.uid()) and exists(select 1 from public.messages m join public.conversation_members cm on cm.conversation_id=m.conversation_id where m.id=message_reactions.message_id and cm.user_id=(select auth.uid())));

drop policy if exists message_reports_member_insert on public.message_reports;
create policy message_reports_member_insert on public.message_reports for insert to authenticated with check(reporter_id=(select auth.uid()) and exists(select 1 from public.messages m join public.conversation_members cm on cm.conversation_id=m.conversation_id where m.id=message_reports.message_id and cm.user_id=(select auth.uid())));
drop policy if exists message_reports_own_select on public.message_reports;
create policy message_reports_own_select on public.message_reports for select to authenticated using(reporter_id=(select auth.uid()));

drop policy if exists conversation_products_member_all on public.conversation_products;
create policy conversation_products_member_all on public.conversation_products for all to authenticated using(exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_products.conversation_id and cm.user_id=(select auth.uid()))) with check(exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_products.conversation_id and cm.user_id=(select auth.uid())) and created_by=(select auth.uid()));
drop policy if exists conversation_orders_member_all on public.conversation_orders;
create policy conversation_orders_member_all on public.conversation_orders for all to authenticated using(exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_orders.conversation_id and cm.user_id=(select auth.uid()))) with check(exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_orders.conversation_id and cm.user_id=(select auth.uid())));
drop policy if exists conversation_quotes_member_all on public.conversation_quotes;
create policy conversation_quotes_member_all on public.conversation_quotes for all to authenticated using(exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_quotes.conversation_id and cm.user_id=(select auth.uid()))) with check(created_by=(select auth.uid()) and exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_quotes.conversation_id and cm.user_id=(select auth.uid())));

grant select,insert,update on public.conversations to authenticated;
grant select,insert on public.conversation_members to authenticated;
grant select,insert,update on public.messages to authenticated;
grant select,insert on public.message_attachments to authenticated;
grant select,insert,delete on public.message_reactions to authenticated;
grant select,insert on public.message_reports to authenticated;
grant select,insert,update,delete on public.conversation_products to authenticated;
grant select,insert,update,delete on public.conversation_orders to authenticated;
grant select,insert,update on public.conversation_quotes to authenticated;
grant execute on function public.touch_credichat_updated_at() to authenticated;

do $$ begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
end $$;
