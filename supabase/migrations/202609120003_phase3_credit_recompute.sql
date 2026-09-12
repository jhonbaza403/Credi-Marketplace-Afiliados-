create or replace function public.recompute_credi_credit_profile(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := 0;
  v_completed integer := 0;
  v_recent integer := 0;
  v_score numeric;
  v_band text;
  v_limit numeric;
  v_decision text;
begin
  if p_user_id is null then raise exception 'user_id_required'; end if;
  select count(*)::int, count(*) filter (where status in ('completed','delivered'))::int,
         count(*) filter (where created_at >= now() - interval '90 days')::int
    into v_total, v_completed, v_recent
    from public.orders where user_id = p_user_id;

  v_score := greatest(0, least(1,
    0.55 * case when v_total = 0 then 0 else v_completed::numeric / v_total end +
    0.30 * least(v_recent, 20)::numeric / 20 +
    0.15 * case when exists (select 1 from public.profiles where id = p_user_id) then 1 else 0 end
  ));
  v_band := case when v_score >= .85 then 'A' when v_score >= .70 then 'B' when v_score >= .55 then 'C' when v_score >= .40 then 'D' else 'E' end;
  v_decision := case when v_score >= .70 then 'approved' when v_score >= .45 then 'review' else 'declined' end;
  v_limit := round(greatest(0, least(1000, v_score * 1000))::numeric, 2);

  insert into public.credi_credit_profiles(user_id, score, risk_band, suggested_limit, model_name, model_version, status, updated_at)
  values (p_user_id, v_score, v_band, v_limit, 'credi-activity-risk-rpc-v1', '1.0.0', v_decision, now())
  on conflict (user_id) do update set score = excluded.score, risk_band = excluded.risk_band,
    suggested_limit = excluded.suggested_limit, model_name = excluded.model_name,
    model_version = excluded.model_version, status = excluded.status, updated_at = now();

  return jsonb_build_object('user_id', p_user_id, 'score', v_score, 'risk_band', v_band, 'suggested_limit', v_limit, 'decision', v_decision, 'methodology', 'deterministic activity baseline');
end;
$$;

revoke all on function public.recompute_credi_credit_profile(uuid) from public;
revoke all on function public.recompute_credi_credit_profile(uuid) from anon;
grant execute on function public.recompute_credi_credit_profile(uuid) to authenticated;
