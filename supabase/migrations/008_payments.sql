CREATE OR REPLACE FUNCTION public.prevent_affiliate_self_referral()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    affiliate_owner uuid;
BEGIN
    SELECT user_id
    INTO affiliate_owner
    FROM public.affiliates
    WHERE id = NEW.affiliate_id;

    IF affiliate_owner IS NOT NULL
       AND NEW.buyer_id = affiliate_owner
    THEN
        RAISE EXCEPTION 'affiliate_self_referral'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_affiliate_self_referral
ON public.affiliate_attributions;

CREATE TRIGGER trg_prevent_affiliate_self_referral
BEFORE INSERT OR UPDATE
ON public.affiliate_attributions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_affiliate_self_referral();