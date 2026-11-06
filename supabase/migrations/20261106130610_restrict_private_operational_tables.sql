DO $$
BEGIN
  IF to_regclass('public.credi_supply_sources') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credi_supply_sources' AND policyname='credi_supply_sources_deny_clients') THEN
    CREATE POLICY credi_supply_sources_deny_clients ON public.credi_supply_sources AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF to_regclass('public.api_rate_limits') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='api_rate_limits' AND policyname='api_rate_limits_deny_clients') THEN
    CREATE POLICY api_rate_limits_deny_clients ON public.api_rate_limits AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF to_regclass('public.operation_events') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='operation_events' AND policyname='operation_events_admin_select') THEN
    CREATE POLICY operation_events_admin_select ON public.operation_events FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
  END IF;
  IF to_regclass('public.tax_exemptions') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tax_exemptions' AND policyname='tax_exemptions_deny_clients') THEN
    CREATE POLICY tax_exemptions_deny_clients ON public.tax_exemptions AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF to_regclass('public.tax_filings') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tax_filings' AND policyname='tax_filings_deny_clients') THEN
    CREATE POLICY tax_filings_deny_clients ON public.tax_filings AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF to_regclass('public.tax_reports') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tax_reports' AND policyname='tax_reports_deny_clients') THEN
    CREATE POLICY tax_reports_deny_clients ON public.tax_reports AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;