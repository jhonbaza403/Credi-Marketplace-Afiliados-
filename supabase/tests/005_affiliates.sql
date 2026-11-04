-- TEST 005 — AFFILIATE INTEGRITY
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.affiliates WHERE btrim(code) = '') THEN
    RAISE EXCEPTION 'Affiliate code cannot be empty';
  END IF;
  IF EXISTS (SELECT 1 FROM public.affiliate_commission_ledger WHERE commission_amount < 0) THEN
    RAISE EXCEPTION 'Affiliate commission cannot be negative';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.affiliate_attributions aa
    JOIN public.affiliates a ON a.id = aa.affiliate_id
    WHERE aa.buyer_id IS NOT NULL AND a.user_id = aa.buyer_id
  ) THEN
    RAISE EXCEPTION 'Self-referral detected in affiliate attribution';
  END IF;
END $$;
SELECT 'TEST 005 — AFFILIATES: PASS' AS test_result;
ROLLBACK;
