CREATE OR REPLACE FUNCTION public.submit_kyc_identity(
  p_country text,
  p_document_type text,
  p_document_number text,
  p_documents jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path='public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_case uuid;
  v_required text[] := ARRAY['id_front','id_back','profile_photo','left_photo','right_photo'];
  v_type text;
  v_path text;
  v_count integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF p_country IS NULL OR p_country !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'INVALID_COUNTRY'; END IF;
  IF p_document_type IS NULL OR p_document_type NOT IN ('id_card','passport','drivers_license') THEN RAISE EXCEPTION 'INVALID_DOCUMENT_TYPE'; END IF;
  IF p_document_number IS NULL OR char_length(trim(p_document_number)) < 3 OR char_length(trim(p_document_number)) > 80 THEN RAISE EXCEPTION 'INVALID_DOCUMENT_NUMBER'; END IF;
  IF jsonb_typeof(p_documents) <> 'array' THEN RAISE EXCEPTION 'INVALID_DOCUMENTS'; END IF;
  SELECT count(*) INTO v_count FROM jsonb_array_elements(p_documents) x WHERE x ? 'type' AND x ? 'path';
  IF v_count < 5 THEN RAISE EXCEPTION 'REQUIRED_KYC_FILES_MISSING'; END IF;
  FOREACH v_type IN ARRAY v_required LOOP
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_documents) x WHERE x->>'type'=v_type AND char_length(trim(x->>'path'))>0) THEN
      RAISE EXCEPTION 'REQUIRED_KYC_FILE_MISSING:%', v_type;
    END IF;
  END LOOP;

  SELECT id INTO v_case FROM public.kyc_cases WHERE user_id=v_user ORDER BY created_at DESC LIMIT 1;
  IF v_case IS NULL THEN
    INSERT INTO public.kyc_cases(user_id,status,country,document_type,document_number,submitted_at)
    VALUES(v_user,'submitted',p_country,p_document_type,trim(p_document_number),now()) RETURNING id INTO v_case;
  ELSE
    UPDATE public.kyc_cases
      SET status='submitted',country=p_country,document_type=p_document_type,document_number=trim(p_document_number),submitted_at=now(),updated_at=now(),rejection_reason=NULL
      WHERE id=v_case AND user_id=v_user;
    DELETE FROM public.kyc_documents WHERE case_id=v_case;
  END IF;

  FOR v_type, v_path IN SELECT x->>'type', x->>'path' FROM jsonb_array_elements(p_documents) x LOOP
    IF v_type IN ('id_front','id_back','profile_photo','left_photo','right_photo') THEN
      INSERT INTO public.kyc_documents(case_id,document_type,storage_path,mime_type,size_bytes)
      VALUES(v_case,v_type,v_path,'application/octet-stream',1);
    END IF;
  END LOOP;
  RETURN v_case;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_kyc_identity(text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_kyc_identity(text,text,text,jsonb) TO authenticated;
