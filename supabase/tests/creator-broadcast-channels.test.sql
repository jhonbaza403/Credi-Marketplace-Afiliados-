BEGIN;
SELECT plan(28);
SELECT has_table('public','creator_profiles','Creator profile table exists');
SELECT has_table('public','creator_follows','Creator follow relation exists');
SELECT has_table('public','broadcast_channels','Broadcast channel table exists');
SELECT has_table('public','broadcast_channel_members','Broadcast channel membership table exists');
SELECT has_table('public','broadcast_channel_posts','Broadcast channel post table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.creator_profiles'::regclass),'Creator profiles enforce RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.creator_follows'::regclass),'Creator follows enforce RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.broadcast_channels'::regclass),'Channels enforce RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.broadcast_channel_members'::regclass),'Channel memberships enforce RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.broadcast_channel_posts'::regclass),'Channel posts enforce RLS');
SELECT has_function('public','create_broadcast_channel',ARRAY['text','text','text','text','text'],'Channel creation is transactional');
SELECT ok(has_function_privilege('authenticated','public.create_broadcast_channel(text,text,text,text,text)','EXECUTE'),'Authenticated users may create channels');
SELECT ok(NOT has_function_privilege('anon','public.create_broadcast_channel(text,text,text,text,text)','EXECUTE'),'Anonymous users cannot create channels');
SELECT has_function('private','is_broadcast_channel_member',ARRAY['uuid'],'Private membership helper exists');
SELECT has_function('private','is_broadcast_channel_manager',ARRAY['uuid'],'Private channel manager helper exists');
SELECT has_function('private','can_view_broadcast_channel',ARRAY['uuid'],'Private channel visibility helper exists');
SELECT ok(has_table_privilege('anon','public.creator_profiles','SELECT'),'Anonymous readers can query public creator profiles subject to RLS');
SELECT ok(NOT has_table_privilege('anon','public.creator_follows','SELECT'),'Anonymous readers cannot enumerate creator followers');
SELECT ok(NOT has_table_privilege('anon','public.broadcast_channel_members','SELECT'),'Anonymous readers cannot enumerate channel membership');
SELECT has_table('public','broadcast_channel_invites','Private channel invite table exists');
SELECT ok(NOT has_table_privilege('anon','public.broadcast_channel_invites','SELECT'),'Anonymous users cannot enumerate private channel invites');
SELECT ok(has_function_privilege('authenticated','public.accept_broadcast_channel_invite(text)','EXECUTE'),'Authenticated users may accept a one-time invite token');
SELECT has_function('private','accept_broadcast_channel_invite',ARRAY['text'],'Invite acceptance is implemented in the private schema');
SELECT ok(NOT has_function_privilege('anon','public.accept_broadcast_channel_invite(text)','EXECUTE'),'Anonymous users cannot accept channel invites');
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='broadcast_channel_members' AND policyname='broadcast_channel_members_self_update'),'Subscribers cannot self-approve pending membership');
SELECT ok(EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='broadcast_channel_members' AND policyname='broadcast_channel_members_manager_update'),'Only manager policies can change subscriber approval state');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.broadcast_channel_invites'::regclass),'Private channel invites enforce RLS');

SELECT ok(
  EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='broadcast_channel_posts'),
  'Channel posts join Supabase Realtime when the publication exists'
);
SELECT * FROM finish();
ROLLBACK;
