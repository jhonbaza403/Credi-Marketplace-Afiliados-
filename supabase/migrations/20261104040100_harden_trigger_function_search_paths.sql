-- Match the reviewed Production search_path configuration for trigger functions.
-- The function bodies are unchanged; these are not directly callable RPC business operations.
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.set_idempotency_updated_at() SET search_path = '';
ALTER FUNCTION public.set_affiliate_updated_at() SET search_path = '';
ALTER FUNCTION public.prevent_affiliate_self_referral() SET search_path = public;
