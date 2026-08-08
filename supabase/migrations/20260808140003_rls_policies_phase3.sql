-- ELEVO FIT — Fase 3: RLS policies for plans and plan_schedule_categories.

-- ---------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------

drop policy if exists "plans_select_members" on public.plans;
create policy "plans_select_members" on public.plans
  for select
  using (public.is_org_member(organization_id));

drop policy if exists "plans_write_owner_admin" on public.plans;
create policy "plans_write_owner_admin" on public.plans
  for all
  using (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']))
  with check (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']));

-- ---------------------------------------------------------------------
-- plan_schedule_categories
-- ---------------------------------------------------------------------

create or replace function public.plan_organization_id(p_plan_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from public.plans where id = p_plan_id;
$$;

comment on function public.plan_organization_id(uuid) is 'organization_id of a plan, for use in RLS policies on tables that reference plans (e.g. plan_schedule_categories, subscriptions).';
grant execute on function public.plan_organization_id(uuid) to authenticated;

drop policy if exists "plan_categories_select_members" on public.plan_schedule_categories;
create policy "plan_categories_select_members" on public.plan_schedule_categories
  for select
  using (public.is_org_member(public.plan_organization_id(plan_id)));

drop policy if exists "plan_categories_write_owner_admin" on public.plan_schedule_categories;
create policy "plan_categories_write_owner_admin" on public.plan_schedule_categories
  for all
  using (public.has_role_in_org(public.plan_organization_id(plan_id), array['OWNER', 'ADMIN']))
  with check (public.has_role_in_org(public.plan_organization_id(plan_id), array['OWNER', 'ADMIN']));
