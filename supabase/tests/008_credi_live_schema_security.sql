-- Regression contract for Credi LIVE commercial data and host ownership.
-- Run after 20261104040200_restore_credi_live_commerce_schema.sql.

begin;

do $$
declare
  v_table text;
  v_tables text[] := array[
    'chat_live_products',
    'chat_live_giveaways',
    'chat_live_moderators',
    'chat_live_blocked_keywords',
    'chat_live_reactions'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is null then
      raise exception 'FAIL: missing LIVE table %', v_table;
    end if;
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=v_table and c.relrowsecurity
    ) then
      raise exception 'FAIL: RLS disabled on %', v_table;
    end if;
    if has_table_privilege('anon', format('public.%I',v_table), 'SELECT')
       or has_table_privilege('anon', format('public.%I',v_table), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I',v_table), 'TRUNCATE') then
      raise exception 'FAIL: unsafe direct table grant on %', v_table;
    end if;
    if not has_table_privilege('authenticated', format('public.%I',v_table), 'SELECT')
       or not has_table_privilege('authenticated', format('public.%I',v_table), 'INSERT')
       or not has_table_privilege('authenticated', format('public.%I',v_table), 'UPDATE')
       or not has_table_privilege('authenticated', format('public.%I',v_table), 'DELETE') then
      raise exception 'FAIL: authenticated route access missing on %', v_table;
    end if;
  end loop;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='chat_live_rooms'
      and column_name='playback_url'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='chat_live_rooms'
      and column_name='stream_provider'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='chat_live_rooms'
      and column_name='scheduled_at'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='chat_live_rooms'
      and column_name='settings'
  ) then
    raise exception 'FAIL: LIVE room runtime fields are incomplete';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.chat_live_rooms'::regclass
      and conname='chat_live_rooms_status_check'
      and pg_get_constraintdef(oid) like '%scheduled%'
      and pg_get_constraintdef(oid) like '%cancelled%'
  ) then
    raise exception 'FAIL: LIVE scheduled/cancelled state constraint missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.chat_live_messages'::regclass
      and conname='chat_live_messages_body_check'
      and pg_get_constraintdef(oid) like '%500%'
  ) then
    raise exception 'FAIL: LIVE message length contract must allow 500 characters';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='chat_live_products'
      and policyname='chat_live_products_host_write'
      and cmd='INSERT'
      and coalesce(with_check,'') like '%vendor_id%'
  ) then
    raise exception 'FAIL: LIVE product insert lacks store ownership guard';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='chat_live_messages'
      and policyname='chat_live_messages_delete_host_moderator'
      and cmd='DELETE'
      and coalesce(qual,'') like '%chat_live_moderators%'
  ) then
    raise exception 'FAIL: LIVE comment delete host/moderator authorization missing';
  end if;

  if exists (
    select 1 from (values
      ('chat_live_rooms'),
      ('chat_live_messages'),
      ('chat_live_products'),
      ('chat_live_reactions')
    ) required(table_name)
    where not exists (
      select 1 from pg_publication_tables pt
      where pt.pubname='supabase_realtime'
        and pt.schemaname='public'
        and pt.tablename=required.table_name
    )
  ) then
    raise exception 'FAIL: LIVE Realtime publication is incomplete';
  end if;
end;
$$;

rollback;
