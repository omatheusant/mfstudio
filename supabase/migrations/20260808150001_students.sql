-- ELEVO FIT — Fase 4: students
--
-- The business record for a student, separate from `profiles` (identity)
-- and `organization_members` (auth role/access). Name/phone/avatar live
-- on `profiles` — this table only holds what's specific to being a
-- student of THIS organization: status and staff notes.
--
-- Invariant (enforced by the creation flow, not the database): every
-- `students` row has a matching `organization_members` row with
-- `role = 'STUDENT'` for the same `(organization_id, profile_id)`. A
-- student always has login access — see docs/business-rules.md for why
-- (Fase 4 uses `auth.admin.inviteUserByEmail`, not a passwordless
-- "on paper only" record).

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

comment on table public.students is 'Business record for a student within an organization. Identity lives in profiles; role/access lives in organization_members.';

create index if not exists students_org_idx on public.students (organization_id);
create index if not exists students_profile_idx on public.students (profile_id);

alter table public.students enable row level security;

drop trigger if exists set_updated_at on public.students;
create trigger set_updated_at
  before update on public.students
  for each row
  execute function public.set_updated_at();
