-- Credi Marketplace
-- MIGRATION 025: Stripe Live catalog binding
-- Binds the application plans to the real Stripe Products/Prices created for the live account.

BEGIN;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_monthly_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_yearly_price_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS plans_stripe_product_id_uniq
  ON public.plans(stripe_product_id)
  WHERE stripe_product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS plans_stripe_monthly_price_id_uniq
  ON public.plans(stripe_monthly_price_id)
  WHERE stripe_monthly_price_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS plans_stripe_yearly_price_id_uniq
  ON public.plans(stripe_yearly_price_id)
  WHERE stripe_yearly_price_id IS NOT NULL;

UPDATE public.plans
SET stripe_product_id = 'prod_VEgYnYPJaYzzCf',
    stripe_monthly_price_id = 'price_1UEDBv4JgUN5dmYj7MTtzcMF',
    stripe_yearly_price_id = 'price_1UEDBy4JgUN5dmYjrCFoVdJc'
WHERE code = 'creator';

UPDATE public.plans
SET stripe_product_id = 'prod_VEgYK41iIZjTxj',
    stripe_monthly_price_id = 'price_1UEDC14JgUN5dmYjGGPUtkIi',
    stripe_yearly_price_id = 'price_1UEDC44JgUN5dmYjI8x9NksE'
WHERE code = 'business';

UPDATE public.plans
SET stripe_product_id = 'prod_VEgYCMLM8Wbl6n',
    stripe_monthly_price_id = 'price_1UEDC74JgUN5dmYjNNz9gdWp',
    stripe_yearly_price_id = 'price_1UEDCA4JgUN5dmYjju09qNg2'
WHERE code = 'enterprise';

COMMIT;
