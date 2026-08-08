-- ELEVO FIT — development seed data.
--
-- NEVER run this against a production project. It inserts directly into
-- `auth.users`/`auth.identities` (fake data only) so you get working
-- logins without going through the signup/confirmation flow.
--
-- Local dev (Supabase CLI): runs automatically on `supabase db reset`.
-- Hosted dev project: paste into the SQL Editor (it connects as
-- `postgres`, which has the privileges this script needs) — do this only
-- on a throwaway/dev Supabase project, never on anything real.
--
-- All seeded users share the password: elevofit123
--
-- Emails / roles for MF Studio (see docs/business-rules.md):
--   owner@mfstudio.dev      OWNER
--   admin@mfstudio.dev      ADMIN
--   professor@mfstudio.dev  PROFESSOR
--   aluno@mfstudio.dev      STUDENT
--
-- Also seeds: organization_settings, schedule_categories
-- (Premium/Alternativo) and schedule_slots Mon–Fri (Fase 2); 8 plans
-- (Bronze/Prata/Ouro/Diamante × Premium/Alternativo) (Fase 3).
--
-- This file grows across phases: later phases append students, bookings
-- and payments for the same MF Studio org created here.

do $$
declare
  v_owner_id uuid := '00000000-0000-0000-0000-000000000001';
  v_admin_id uuid := '00000000-0000-0000-0000-000000000002';
  v_prof_id uuid := '00000000-0000-0000-0000-000000000003';
  v_student_id uuid := '00000000-0000-0000-0000-000000000004';
  v_org_id uuid;
  v_premium_id uuid;
  v_alternativo_id uuid;
  v_password text := 'elevofit123';
begin
  -- 1. Fake auth users (idempotent: safe to re-run).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) values
    ('00000000-0000-0000-0000-000000000000', v_owner_id, 'authenticated', 'authenticated', 'owner@mfstudio.dev', crypt(v_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Marcos Ferreira"}', now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated', 'admin@mfstudio.dev', crypt(v_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ana Paula"}', now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_prof_id, 'authenticated', 'authenticated', 'professor@mfstudio.dev', crypt(v_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Nogueira"}', now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_student_id, 'authenticated', 'authenticated', 'aluno@mfstudio.dev', crypt(v_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"João Aluno"}', now(), now(), '', '')
  on conflict (id) do nothing;

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values
    (gen_random_uuid(), v_owner_id::text, v_owner_id, jsonb_build_object('sub', v_owner_id::text, 'email', 'owner@mfstudio.dev'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_admin_id::text, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@mfstudio.dev'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_prof_id::text, v_prof_id, jsonb_build_object('sub', v_prof_id::text, 'email', 'professor@mfstudio.dev'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_student_id::text, v_student_id, jsonb_build_object('sub', v_student_id::text, 'email', 'aluno@mfstudio.dev'), 'email', now(), now(), now())
  on conflict (provider, provider_id) do nothing;

  -- public.profiles rows are created automatically by the
  -- on_auth_user_created trigger (20260808120002_profiles.sql).

  -- 2. MF Studio organization. Inserted directly (not through the
  -- create_organization RPC) because this script needs to seed several
  -- specific memberships at once, run as `postgres` which bypasses RLS.
  insert into public.organizations (name, slug, timezone, phone, email)
  values ('MF Studio', 'mf-studio', 'America/Sao_Paulo', '(11) 90000-0000', 'contato@mfstudio.dev')
  on conflict (slug) do update set name = excluded.name
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values
    (v_org_id, v_owner_id, 'OWNER', 'ACTIVE'),
    (v_org_id, v_admin_id, 'ADMIN', 'ACTIVE'),
    (v_org_id, v_prof_id, 'PROFESSOR', 'ACTIVE'),
    (v_org_id, v_student_id, 'STUDENT', 'ACTIVE')
  on conflict (organization_id, user_id) do update set role = excluded.role, status = excluded.status;

  -- 3. Default organization_settings (Fase 2). Values below just repeat
  -- the column defaults — spelled out here so this seed stays correct
  -- even if the defaults ever change.
  insert into public.organization_settings (
    organization_id, default_capacity, cancellation_window_minutes,
    checkin_open_minutes_before, checkin_close_minutes_after, block_booking_when_overdue
  )
  values (v_org_id, 8, 120, 60, 15, true)
  on conflict (organization_id) do nothing;

  -- 4. Schedule categories (Fase 2). MF Studio's own configuration —
  -- these names are seed data, not something the app logic knows about.
  insert into public.schedule_categories (organization_id, name, description)
  values (v_org_id, 'Premium', 'Horários de maior procura: início da manhã e fim de tarde/noite.')
  on conflict (organization_id, name) do update set description = excluded.description
  returning id into v_premium_id;

  insert into public.schedule_categories (organization_id, name, description)
  values (v_org_id, 'Alternativo', 'Horários de menor procura, ao longo do meio do dia.')
  on conflict (organization_id, name) do update set description = excluded.description
  returning id into v_alternativo_id;

  -- 5. Schedule slots (Fase 2), Monday(1)–Friday(5). Capacities below are
  -- illustrative seed data, not a rule of the system — every organization
  -- configures its own.
  insert into public.schedule_slots (organization_id, schedule_category_id, day_of_week, start_time, end_time, capacity)
  select v_org_id, v_premium_id, d, t, t + interval '1 hour', 8
  from generate_series(1, 5) as d
  cross join unnest(array['05:00', '06:00', '07:00', '17:00', '18:00', '19:00', '20:00']::time[]) as t
  on conflict (organization_id, day_of_week, start_time, end_time) do nothing;

  insert into public.schedule_slots (organization_id, schedule_category_id, day_of_week, start_time, end_time, capacity)
  select v_org_id, v_alternativo_id, d, t, t + interval '1 hour', 12
  from generate_series(1, 5) as d
  cross join unnest(array['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']::time[]) as t
  on conflict (organization_id, day_of_week, start_time, end_time) do nothing;

  -- 6. Plans (Fase 3). Bronze/Prata/Ouro/Diamante are seed data for MF
  -- Studio, not a fixed tier system — any organization defines its own.
  insert into public.plans (organization_id, name, price, billing_cycle, session_limit, session_period)
  values
    (v_org_id, 'Bronze', 85.00, 'MONTHLY', 2, 'WEEK'),
    (v_org_id, 'Bronze Alternativo', 65.00, 'MONTHLY', 2, 'WEEK'),
    (v_org_id, 'Prata', 95.00, 'MONTHLY', 3, 'WEEK'),
    (v_org_id, 'Prata Alternativo', 75.00, 'MONTHLY', 3, 'WEEK'),
    (v_org_id, 'Ouro', 120.00, 'MONTHLY', 5, 'WEEK'),
    (v_org_id, 'Ouro Alternativo', 100.00, 'MONTHLY', 5, 'WEEK'),
    (v_org_id, 'Diamante', 150.00, 'MONTHLY', 7, 'WEEK'),
    (v_org_id, 'Diamante Alternativo', 120.00, 'MONTHLY', 7, 'WEEK')
  on conflict (organization_id, name) do update set
    price = excluded.price,
    session_limit = excluded.session_limit,
    session_period = excluded.session_period,
    billing_cycle = excluded.billing_cycle;

  -- Each plan grants access to exactly one category here — by naming
  -- convention only ("* Alternativo" → Alternativo). plan_schedule_categories
  -- itself supports a plan granting several categories; MF Studio's seed
  -- just doesn't happen to use that.
  insert into public.plan_schedule_categories (plan_id, schedule_category_id)
  select p.id, case when p.name like '%Alternativo' then v_alternativo_id else v_premium_id end
  from public.plans p
  where p.organization_id = v_org_id
    and p.name in (
      'Bronze', 'Bronze Alternativo', 'Prata', 'Prata Alternativo',
      'Ouro', 'Ouro Alternativo', 'Diamante', 'Diamante Alternativo'
    )
  on conflict (plan_id, schedule_category_id) do nothing;
end $$;
