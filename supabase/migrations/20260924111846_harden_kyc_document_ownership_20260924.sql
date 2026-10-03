create or replace function public.submit_kyc_identity(p_country text,p_document_type text,p_document_number text,p_documents jsonb)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare v_user uuid:=(select auth.uid()); v_case uuid; v_required text[]:=array['id_front','id_back','profile_photo','left_photo','right_photo']; v_type text; v_path text; v_mime text; v_size bigint;
begin
 if v_user is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
 if p_country is null or p_country !~ '^[A-Z]{2}$' then raise exception 'INVALID_COUNTRY' using errcode='22023'; end if;
 if p_document_type is null or p_document_type not in ('id_card','passport','drivers_license') then raise exception 'INVALID_DOCUMENT_TYPE' using errcode='22023'; end if;
 if p_document_number is null or char_length(trim(p_document_number))<3 or char_length(trim(p_document_number))>80 then raise exception 'INVALID_DOCUMENT_NUMBER' using errcode='22023'; end if;
 if jsonb_typeof(p_documents)<>'array' or jsonb_array_length(p_documents)>10 then raise exception 'INVALID_DOCUMENTS' using errcode='22023'; end if;
 foreach v_type in array v_required loop
  if not exists(select 1 from jsonb_array_elements(p_documents) x where x->>'type'=v_type and char_length(trim(x->>'path')) between 1 and 512 and (x->>'size_bytes')::bigint between 1 and 15728640 and lower(x->>'mime_type') in ('image/jpeg','image/png','image/webp') and exists(select 1 from storage.objects so where so.bucket_id='marketplace-media' and so.name=trim(x->>'path') and (so.owner_id=v_user::text or so.owner=v_user) and coalesce(so.is_delete_marker,false)=false)) then raise exception 'REQUIRED_KYC_FILE_MISSING_OR_NOT_OWNED:%',v_type; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_documents) x where (x->>'size_bytes')::bigint>15728640 or lower(coalesce(x->>'mime_type','')) not in ('image/jpeg','image/png','image/webp')) then raise exception 'INVALID_KYC_FILE' using errcode='22023'; end if;
 select id into v_case from public.kyc_cases where user_id=v_user order by created_at desc limit 1;
 if v_case is null then
  insert into public.kyc_cases(user_id,status,country,document_type,document_number,submitted_at) values(v_user,'submitted',p_country,p_document_type,trim(p_document_number),now()) returning id into v_case;
 else
  update public.kyc_cases set status='submitted',country=p_country,document_type=p_document_type,document_number=trim(p_document_number),submitted_at=now(),updated_at=now(),rejection_reason=null where id=v_case and user_id=v_user;
  delete from public.kyc_documents where case_id=v_case;
 end if;
 for v_type,v_path,v_mime,v_size in select x->>'type',trim(x->>'path'),lower(x->>'mime_type'),(x->>'size_bytes')::bigint from jsonb_array_elements(p_documents) x loop
  if v_type=any(v_required) then insert into public.kyc_documents(case_id,document_type,storage_path,mime_type,size_bytes) values(v_case,v_type,v_path,v_mime,v_size); end if;
 end loop;
 return v_case;
end;
$function$;
