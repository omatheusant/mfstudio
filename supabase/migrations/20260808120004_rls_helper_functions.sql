-- ELEVO FIT — Fase 1: RLS helper functions
--
-- These SECURITY DEFINER functions are the ONLY place allowed to query
-- organization_members for authorization purposes. They run with the
-- privileges of their (postgres) owner, which bypasses RLS internally —
-- this is deliberate and is what lets a policy ON organization_members
-- check membership WITHOUT recursively re-applying organization_members'
-- own RLS policies to itself (Postgres would otherwise raise
-- "infinite recursion detected in policy for relation organization_members").
--
-- `set search_path = public` on every function prevents search-path
-- hijacking attacks against SECURITY DEFINER functions.

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
  );
$$;

comment on function public.is_org_member(uuid) is 'True if the authenticated user is an ACTIVE member of the given organization.';
grant execute on function public.is_org_member(uuid) to authenticated;

create or replace function public.has_role_in_org(p_organization_id uuid, p_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and m.role = any (p_roles)
  );
$$;

comment on function public.has_role_in_org(uuid, text[]) is 'True if the authenticated user is an ACTIVE member of the given organization with one of the given roles.';
grant execute on function public.has_role_in_org(uuid, text[]) to authenticated;

create or replace function public.my_organization_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select m.organization_id
  from public.organization_members m
  where m.user_id = auth.uid()
    and m.status = 'ACTIVE';
$$;

comment on function public.my_organization_ids() is 'Every organization the authenticated user actively belongs to.';
grant execute on function public.my_organization_ids() to authenticated;

create or replace function public.shares_org_with(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid()
      and mine.status = 'ACTIVE'
      and theirs.user_id = p_user_id
      and theirs.status = 'ACTIVE'
  );
$$;

comment on function public.shares_org_with(uuid) is 'True if the authenticated user shares at least one ACTIVE organization membership with the given user.';
grant execute on function public.shares_org_with(uuid) to authenticated;
