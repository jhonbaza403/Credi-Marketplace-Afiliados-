begin;

create index if not exists idx_product_feedback_linked_case_id
  on public.product_feedback (linked_case_id);
create index if not exists idx_product_feedback_user_id
  on public.product_feedback (user_id);
create index if not exists idx_quality_findings_case_id
  on public.quality_findings (case_id);
create index if not exists idx_quality_findings_created_by
  on public.quality_findings (created_by);
create index if not exists idx_quality_findings_reviewed_by
  on public.quality_findings (reviewed_by);
create index if not exists idx_support_case_events_actor_id
  on public.support_case_events (actor_id);
create index if not exists idx_support_cases_linked_case_id
  on public.support_cases (linked_case_id);

commit;
