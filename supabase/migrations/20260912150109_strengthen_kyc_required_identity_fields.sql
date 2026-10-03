ALTER TABLE public.kyc_cases ADD COLUMN IF NOT EXISTS document_number text;

UPDATE public.kyc_cases SET document_number = 'PENDING-' || id::text WHERE document_number IS NULL;

ALTER TABLE public.kyc_cases ALTER COLUMN document_number SET NOT NULL;
ALTER TABLE public.kyc_cases DROP CONSTRAINT IF EXISTS kyc_cases_document_number_check;
ALTER TABLE public.kyc_cases ADD CONSTRAINT kyc_cases_document_number_check CHECK (char_length(trim(document_number)) BETWEEN 3 AND 80);

ALTER TABLE public.kyc_documents DROP CONSTRAINT IF EXISTS kyc_documents_document_type_check;
ALTER TABLE public.kyc_documents ADD CONSTRAINT kyc_documents_document_type_check CHECK (document_type = ANY (ARRAY['id_front','id_back','passport','drivers_license','selfie','profile_photo','left_photo','right_photo','address_proof','other']));

COMMENT ON COLUMN public.kyc_cases.document_number IS 'Required identity document number. Never expose this value publicly.';
COMMENT ON TABLE public.kyc_documents IS 'Private KYC evidence. Required identity package may include document front/back, profile photo and left/right profile photos according to the verification flow.';
