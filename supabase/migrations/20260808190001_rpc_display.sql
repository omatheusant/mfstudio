-- ELEVO FIT — Fase 10: painel de TV (/studio/[slug]/display)
--
-- This screen is meant to run unattended on a TV/tablet in the Studio
-- lobby — no login. Since it's public, these functions are the ONLY
-- data path for it: SECURITY DEFINER (bypasses RLS, which has no
-- concept of an anonymous visitor anyway), but each one hand-picks a
-- deliberately minimal, non-sensitive set of columns — first name and a
-- presence flag, never email/phone/id or anything from other students'
-- private data. Granted to `anon`, unlike every other function in this
-- schema.
--
-- Multi-tenancy note: the briefing describes the route as
-- `/studio/display` (implicitly single-tenant). Since a second Studio
-- must be able to use the product unmodified (see docs/architecture.md
-- §"Critério de sucesso"), the actual route is `/studio/[slug]/display`
-- and every function here takes `p_org_slug` — never an id the caller
-- could tamper with to peek at another organization's roster, since the
-- slug is a public identifier by design (already used in URLs).

create or replace function public.get_display_organization(p_org_slug text)
returns table (name text, logo_url text, timezone text)
language sql
security definer
set search_path = public
stable
as $$
  select o.name, o.logo_url, o.timezone
  from public.organizations o
  where o.slug = p_org_slug;
$$;

comment on function public.get_display_organization(text) is 'Public, minimal org info (name/logo/timezone) for the unauthenticated TV display.';
grant execute on function public.get_display_organization(text) to anon, authenticated;

create or replace function public.get_display_agenda(p_org_slug text, p_date date default current_date)
returns table (
  slot_id uuid,
  start_time time,
  end_time time,
  category_name text,
  capacity integer,
  reserved integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    ss.id,
    ss.start_time,
    ss.end_time,
    sc.name,
    ss.capacity,
    (
      select count(*)::integer
      from public.bookings b
      where b.schedule_slot_id = ss.id
        and b.date = p_date
        and b.status = 'RESERVED'
    )
  from public.schedule_slots ss
  join public.schedule_categories sc on sc.id = ss.schedule_category_id
  join public.organizations o on o.id = ss.organization_id
  where o.slug = p_org_slug
    and ss.active = true
    and ss.day_of_week = extract(dow from p_date)::smallint
  order by ss.start_time;
$$;

comment on function public.get_display_agenda(text, date) is 'Public, minimal occupancy-per-slot for the unauthenticated TV display. No student data.';
grant execute on function public.get_display_agenda(text, date) to anon, authenticated;

create or replace function public.get_display_roster(p_org_slug text, p_slot_id uuid, p_date date default current_date)
returns table (first_name text, status text)
language sql
security definer
set search_path = public
stable
as $$
  select
    split_part(coalesce(p.full_name, 'Aluno'), ' ', 1),
    case
      when b.status = 'COMPLETED' then 'PRESENT'
      when b.status = 'NO_SHOW' then 'ABSENT'
      else 'RESERVED'
    end
  from public.bookings b
  join public.schedule_slots ss on ss.id = b.schedule_slot_id
  join public.organizations o on o.id = b.organization_id and o.slug = p_org_slug
  join public.students st on st.id = b.student_id
  join public.profiles p on p.id = st.profile_id
  where b.schedule_slot_id = p_slot_id
    and b.date = p_date
    and b.status in ('RESERVED', 'COMPLETED', 'NO_SHOW')
  order by b.created_at;
$$;

comment on function public.get_display_roster(text, uuid, date) is 'Public, minimal roster (first name + presence only) for one slot on the unauthenticated TV display.';
grant execute on function public.get_display_roster(text, uuid, date) to anon, authenticated;
