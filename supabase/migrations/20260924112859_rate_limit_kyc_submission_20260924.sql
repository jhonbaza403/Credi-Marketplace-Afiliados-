create or replace function public.submit_kyc_identity(p_country text,p_document_type text,p_document_number text,p_documents jsonb)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare u uuid:=(select auth.uid()); case_id uuid; req text[]:=array['id_front','id_back','profile_photo','left_photo','right_photo']; typ text; path text; mime text; sz bigint; rl record;
begin
 if u is null then raise exception 'UNAUTHORIZED'; end if;
 select * into rl from public.consume_api_rate_limit('kyc_submit:'||u::text,3,3600); if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;
 if p_country is null or p_country !~ '^[A-Z]{2}$' then raise exception 'INVALID_COUNTRY'; end if;
 if p_document_type not in('id_card','passport','drivers_license') then raise exception 'INVALID_DOCUMENT_TYPE'; end if;
 if p_document_number is null or char_length(trim(p_document_number))<3 or char_length(trim(p_document_number))>80 then raise exception 'INVALID_DOCUMENT_NUMBER'; end if;
 if jsonb_typeof(p_documents)<>'array' or jsonb_array_length(p_documents)>10 then raise exception 'INVALID_DOCUMENTS'; end if;
 foreach typ in array req loop
  if not exists(select 1 from jsonb_array_elements(p_documents)x where x->>'type'=typ and char_length(trim(x->>'path')) between 1 and 512 and (x->>'size_bytes')::bigint between 1 and 15728640 and lower(x->>'mime_type') in('image/jpeg','image/png','image/webp') and exists(select 1 from storage.objects so where so.bucket_id='marketplace-media' and so.name=trim(x->>'path') and (so.owner_id=u::text or so.owner=u) and coalesce(so.is_delete_marker,false)=false)) then raise exception 'REQUIRED_KYC_FILE_MISSING_OR_NOT_OWNED'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_documents)x where (x->>'size_bytes')::bigint>15728640 or lower(coalesce(x->>'mime_type','')) not in('image/jpeg','image/png','image/webp')) then raise exception 'INVALID_KYC_FILE'; end if;
 select id into case_id from public.kyc_cases where user_id=u order by created_at desc limit 1;
 if case_id is null then insert into public.kyc_cases(user_id,status,country,document_type,document_number,submitted_at) values(u,'submitted',p_country,p_document_type,trim(p_document_number),now()) returning id into case_id;
 else update public.kyc_cases set status='submitted',country=p_country,document_type=p_document_type,document_number=trim(p_document_number),submitted_at=now(),updated_at=now(),rejection_reason=null where id=case_id and user_id=u; delete from public.kyc_documents where case_id=case_id; end if;
 for typ,path,mime,sz in select x->>'type',trim(x->>'path'),lower(x->>'mime_type'),(x->>'size_bytes')::bigint from jsonb_array_elements(p_documents)x loop if typ=any(req) then insert into public.kyc_documents(case_id,document_type,storage_path,mime_type,size_bytes) values(case_id,typ,path,mime,sz); end if; end loop;
 return case_id;
end;$function$;
