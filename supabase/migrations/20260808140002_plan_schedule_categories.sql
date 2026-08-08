-- ELEVO FIT — Fase 3: plan_schedule_categories
--
-- Which schedule_categories a plan grants access to (e.g. a "Bronze"
-- plan → Premium only; MF Studio models "Bronze" vs "Bronze Alternativo"
-- as two separate plans, each linked to one category — but nothing here
-- assumes a 1:1 relationship; a plan could grant access to several
-- categories).

create table if not exists public.plan_schedule_categories (
  plan_id uuid not null references public.plans (id) on delete cascade,
  schedule_category_id uuid not null references public.schedule_categories (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (plan_id, schedule_category_id)
);

comment on table public.plan_schedule_categories is 'Which schedule_categories a plan grants booking access to.';

create index if not exists plan_schedule_categories_category_idx
  on public.plan_schedule_categories (schedule_category_id);

alter table public.plan_schedule_categories enable row level security;

-- Defense in depth: even though RLS only lets an OWNER/ADMIN link a plan
-- they own, nothing stops them from pointing schedule_category_id at a
-- category belonging to a DIFFERENT organization unless we check it here.
-- This trigger is the authoritative guard against that, independent of
-- which policy or client happened to perform the write.
create or replace function public.validate_plan_schedule_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_org uuid;
  v_category_org uuid;
begin
  select organization_id into v_plan_org from public.plans where id = new.plan_id;
  select organization_id into v_category_org from public.schedule_categories where id = new.schedule_category_id;

  if v_plan_org is null or v_category_org is null or v_plan_org <> v_category_org then
    raise exception 'plan_schedule_categories: plan and schedule_category must belong to the same organization';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_plan_schedule_category on public.plan_schedule_categories;
create trigger validate_plan_schedule_category
  before insert or update on public.plan_schedule_categories
  for each row
  execute function public.validate_plan_schedule_category();
