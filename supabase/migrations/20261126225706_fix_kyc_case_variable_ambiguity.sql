BEGIN;

CREATE OR REPLACE FUNCTION private.submit_kyc_identity(
  p_country text,
  p_document_type text,
  p_document_number text,
  p_documents jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  u uuid := (SELECT auth.uid());
  v_case_id uuid;
  req text[] := ARRAY['id_front','id_back','profile_photo','left_photo','right_photo'];
  typ text;
  path text;
  mime text;
  sz bigint;
  rl record;
  x jsonb;
  meta jsonb;
  cnt int;
  v_case public.kyc_cases;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='42501'; END IF;
  SELECT * INTO rl FROM public.consume_api_rate_limit('kyc_submit:'||u::text,3,3600);
  IF NOT rl.allowed THEN RAISE EXCEPTION 'RATE_LIMITED' USING ERRCODE='42900'; END IF;
  IF p_country IS NULL OR upper(trim(p_country)) !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'INVALID_COUNTRY'; END IF;
  IF p_document_type NOT IN ('id_card','passport','drivers_license') THEN RAISE EXCEPTION 'INVALID_DOCUMENT_TYPE'; END IF;
  IF p_document_number IS NULL OR char_length(trim(p_document_number))<3 OR char_length(trim(p_document_number))>80 THEN RAISE EXCEPTION 'INVALID_DOCUMENT_NUMBER'; END IF;
  IF jsonb_typeof(p_documents)<>'array' OR jsonb_array_length(p_documents)<>5 THEN RAISE EXCEPTION 'INVALID_DOCUMENTS'; END IF;

  SELECT * INTO v_case FROM public.kyc_cases
  WHERE user_id=u ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;

  IF FOUND AND v_case.status IN ('approved','under_review','submitted') THEN
    RAISE EXCEPTION 'KYC_CASE_ALREADY_IN_REVIEW';
  END IF;

  FOREACH typ IN ARRAY req LOOP
    SELECT count(*) INTO cnt FROM jsonb_array_elements(p_documents) x WHERE x->>'type'=typ;
    IF cnt<>1 THEN RAISE EXCEPTION 'DUPLICATE_OR_MISSING_KYC_FILE'; END IF;
  END LOOP;

  FOR x IN SELECT value FROM jsonb_array_elements(p_documents) LOOP
    typ:=x->>'type';
    IF typ<>ALL(req) THEN RAISE EXCEPTION 'INVALID_KYC_FILE_TYPE'; END IF;
    path:=trim(x->>'path');
    IF char_length(path)<1 OR char_length(path)>512 THEN RAISE EXCEPTION 'INVALID_KYC_FILE'; END IF;
    IF position('..' in path)>0 OR left(path,1)='/' THEN RAISE EXCEPTION 'INVALID_KYC_FILE_PATH'; END IF;

    SELECT so.metadata INTO meta
    FROM storage.objects so
    WHERE so.bucket_id='kyc-documents'
      AND so.name=path
      AND (so.owner_id=u::text OR so.owner=u)
      AND coalesce(so.is_delete_marker,false)=false
    LIMIT 1;
    IF meta IS NULL THEN RAISE EXCEPTION 'REQUIRED_KYC_FILE_MISSING_OR_NOT_OWNED'; END IF;

    mime:=lower(coalesce(meta->>'mimetype',meta->>'mime_type',''));
    IF mime NOT IN ('image/jpeg','image/png','image/webp','application/pdf') THEN
      RAISE EXCEPTION 'INVALID_KYC_FILE';
    END IF;
    IF mime='application/pdf' AND typ NOT IN ('id_front','id_back','passport','drivers_license') THEN
      RAISE EXCEPTION 'INVALID_KYC_FILE';
    END IF;
    sz:=nullif(meta->>'size','')::bigint;
    IF sz IS NULL OR sz<1 OR sz>10485760 THEN RAISE EXCEPTION 'INVALID_KYC_FILE'; END IF;
    IF coalesce(x->>'mime_type','')<>'' AND lower(trim(x->>'mime_type'))<>mime THEN
      RAISE EXCEPTION 'KYC_MIME_MISMATCH';
    END IF;
    IF coalesce(x->>'size_bytes','')<>'' AND trim(x->>'size_bytes')<>(meta->>'size') THEN
      RAISE EXCEPTION 'KYC_SIZE_MISMATCH';
    END IF;
  END LOOP;

  IF v_case.id IS NULL OR v_case.status IN ('rejected','expired') THEN
    INSERT INTO public.kyc_cases(user_id,status,country,document_type,document_number,submitted_at)
    VALUES(u,'submitted',upper(trim(p_country)),p_document_type,trim(p_document_number),now())
    RETURNING id INTO v_case_id;
  ELSE
    v_case_id:=v_case.id;
    UPDATE public.kyc_cases
    SET status='submitted',country=upper(trim(p_country)),document_type=p_document_type,
        document_number=trim(p_document_number),submitted_at=now(),updated_at=now(),rejection_reason=null
    WHERE id=v_case_id AND user_id=u;
    DELETE FROM public.kyc_documents WHERE kyc_documents.case_id=v_case_id;
  END IF;

  FOR x IN SELECT value FROM jsonb_array_elements(p_documents) LOOP
    typ:=x->>'type';
    path:=trim(x->>'path');
    SELECT so.metadata INTO meta
    FROM storage.objects so
    WHERE so.bucket_id='kyc-documents'
      AND so.name=path
      AND (so.owner_id=u::text OR so.owner=u)
      AND coalesce(so.is_delete_marker,false)=false
    LIMIT 1;
    mime:=lower(coalesce(meta->>'mimetype',meta->>'mime_type',''));
    sz:=(meta->>'size')::bigint;
    INSERT INTO public.kyc_documents(case_id,document_type,storage_path,mime_type,size_bytes)
    VALUES(v_case_id,typ,path,mime,sz);
  END LOOP;

  RETURN v_case_id;
END;
$function$;

DO $contract$
DECLARE
  def text := pg_get_functiondef('private.submit_kyc_identity(text,text,text,jsonb)'::regprocedure);
BEGIN
  IF position('kyc_documents.case_id=v_case_id' in def)=0
     OR position('INTO v_case_id' in def)=0 THEN
    RAISE EXCEPTION 'KYC_CASE_ID_VARIABLE_CONTRACT_FAILED';
  END IF;
END;
$contract$;

COMMIT;
