-- ELEVO FIT — Fase 3: sync_plan_categories RPC
--
-- Replaces the full set of schedule_categories linked to a plan in one
-- call, instead of the client doing a delete-then-insert as two separate
-- round trips (which could partially fail and leave a plan with zero
-- categories). Deliberately SECURITY INVOKER (the default) — RLS on
-- plan_schedule_categories and the validate_plan_schedule_category
-- trigger both still apply normally to whoever calls this.

create or replace function public.sync_plan_categories(p_plan_id uuid, p_category_ids uuid[])
returns void
language plpgsql
set search_path = public
as $$
begin
  delete from public.plan_schedule_categories
  where plan_id = p_plan_id
    and schedule_category_id <> all (coalesce(p_category_ids, array[]::uuid[]));

  insert into public.plan_schedule_categories (plan_id, schedule_category_id)
  select p_plan_id, cat_id
  from unnest(p_category_ids) as cat_id
  on conflict (plan_id, schedule_category_id) do nothing;
end;
$$;

comment on function public.sync_plan_categories(uuid, uuid[]) is 'Replaces the set of schedule_categories linked to a plan. Runs as the caller (not SECURITY DEFINER) so RLS still governs access.';
grant execute on function public.sync_plan_categories(uuid, uuid[]) to authenticated;
