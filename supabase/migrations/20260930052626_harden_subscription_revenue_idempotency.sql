-- Prevent duplicate recognized subscription revenue on webhook retries.
create unique index if not exists platform_revenue_subscription_uniq
  on public.platform_revenue (source_id)
  where source_type = 'subscription' and source_id is not null;
