BEGIN;
SELECT plan(20);

SELECT ok(
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feed_posts' AND policyname='feed_posts_select_public_or_own'),
  'weak unmoderated feed_posts public policy is absent'
);
SELECT ok(
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reels' AND policyname='reels_select_public_or_own'),
  'weak unmoderated reels public policy is absent'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feed_posts' AND policyname='feed_posts_select_visible_or_own' AND qual LIKE '%moderation_status%' AND qual LIKE '%approved%'),
  'public feed posts require moderation approval'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reels' AND policyname='reels_select_visible_or_own' AND qual LIKE '%moderation_status%' AND qual LIKE '%approved%'),
  'public reels require moderation approval'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stories' AND policyname='stories_select_public_or_own' AND qual LIKE '%moderation_status%' AND qual LIKE '%approved%'),
  'public stories require moderation approval'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feed_posts' AND policyname='feed_posts_owner_write' AND cmd='ALL')
  AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feed_posts' AND policyname IN ('feed_posts_owner_delete','feed_posts_owner_insert','feed_posts_owner_update')),
  'feed owner operations use one consolidated policy'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reels' AND policyname='reels_owner_write' AND cmd='ALL')
  AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reels' AND policyname IN ('reels_owner_delete','reels_owner_insert','reels_owner_update')),
  'reel owner operations use one consolidated policy'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stories' AND policyname='stories_owner_write' AND cmd='ALL')
  AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stories' AND policyname IN ('stories_owner_delete','stories_owner_insert','stories_owner_update')),
  'story owner operations use one consolidated policy'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_live_products' AND policyname='chat_live_products_host_write' AND with_check LIKE '%vendor_id%' AND with_check LIKE '%stock%' AND with_check LIKE '%is_active%'),
  'LIVE product insertion requires vendor ownership, active store and positive stock'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_live_products' AND policyname='chat_live_products_host_update_delete' AND with_check LIKE '%vendor_id%' AND with_check LIKE '%stock%' AND with_check LIKE '%is_active%'),
  'LIVE product updates preserve vendor, store and inventory authorization'
);

SELECT ok(
  NOT has_table_privilege('anon','public.feed_posts','INSERT')
  AND NOT has_table_privilege('anon','public.feed_posts','UPDATE')
  AND NOT has_table_privilege('anon','public.feed_posts','DELETE'),
  'anonymous users cannot mutate feed posts'
);
SELECT ok(
  NOT has_table_privilege('anon','public.reels','INSERT')
  AND NOT has_table_privilege('anon','public.reels','UPDATE')
  AND NOT has_table_privilege('anon','public.reels','DELETE'),
  'anonymous users cannot mutate reels'
);
SELECT ok(
  NOT has_table_privilege('anon','public.stories','INSERT')
  AND NOT has_table_privilege('anon','public.stories','UPDATE')
  AND NOT has_table_privilege('anon','public.stories','DELETE'),
  'anonymous users cannot mutate stories'
);
SELECT ok(
  NOT has_table_privilege('anon','public.chat_live_products','SELECT')
  AND NOT has_table_privilege('anon','public.chat_live_products','INSERT')
  AND NOT has_table_privilege('anon','public.chat_live_products','UPDATE')
  AND NOT has_table_privilege('anon','public.chat_live_products','DELETE'),
  'anonymous users have no direct LIVE product table privileges'
);
SELECT ok(
  NOT has_table_privilege('anon','public.social_accounts','SELECT')
  AND NOT has_table_privilege('anon','public.social_publications','SELECT'),
  'social account connections and publication records are not anon-readable'
);
SELECT ok(
  NOT has_table_privilege('anon','public.wallet_journals','SELECT')
  AND NOT has_table_privilege('authenticated','public.wallet_journals','SELECT'),
  'wallet journals are only accessed through controlled server paths'
);
SELECT ok(
  NOT has_table_privilege('anon','public.wallet_refunds','SELECT')
  AND NOT has_table_privilege('authenticated','public.wallet_refunds','SELECT'),
  'wallet refunds are only accessed through controlled server paths'
);
SELECT ok(
  NOT has_table_privilege('anon','public.settlement_account_bindings','SELECT')
  AND NOT has_table_privilege('authenticated','public.settlement_account_bindings','SELECT'),
  'settlement account bindings are not client-readable'
);
SELECT ok(
  NOT has_table_privilege('anon','public.settlement_approval_audit','SELECT')
  AND NOT has_table_privilege('authenticated','public.settlement_approval_audit','SELECT'),
  'settlement approval audit is not client-readable'
);
SELECT ok(
  NOT has_table_privilege('anon','public.settlement_payout_audit','SELECT')
  AND NOT has_table_privilege('authenticated','public.settlement_payout_audit','SELECT'),
  'settlement payout audit is not client-readable'
);

SELECT * FROM finish();
ROLLBACK;
