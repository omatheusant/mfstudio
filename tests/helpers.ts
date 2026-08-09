import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database, DayOfWeek } from "@/types/database";

/**
 * Fase 11 integration test helpers. These tests talk to a REAL Supabase
 * project (the RLS policies, triggers and RPCs under test only exist in
 * Postgres — there is nothing meaningful to unit-test with a mock). See
 * README.md "Testes" for how to point this at your own project.
 */

export const SEED_PASSWORD = "elevofit123";

export const SEED_EMAILS = {
  owner: "owner@mfstudio.dev",
  admin: "admin@mfstudio.dev",
  professor: "professor@mfstudio.dev",
  joao: "aluno@mfstudio.dev", // Ouro / Premium, ACTIVE
  maria: "maria.silva@mfstudio.dev", // Bronze Alternativo / Alternativo, ACTIVE
  pedro: "pedro.santos@mfstudio.dev", // Prata, student INACTIVE, subscription CANCELLED
  beatriz: "beatriz.costa@mfstudio.dev", // Diamante / Premium, ACTIVE
} as const;

export const MF_STUDIO_SLUG = "mf-studio";

/**
 * A different, far-future week on every `npm test` invocation (changes
 * every ~7 minutes of wall-clock time), so repeated runs never collide
 * with bookings a previous run left behind. All booking-related tests
 * share this so they can coexist within one run without colliding with
 * EACH OTHER either (each test still picks its own day/time within it).
 */
export const TEST_RUN_WEEK_OFFSET = 200 + (Math.floor(Date.now() / 1000) % 400);

function url() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

/** Service-role client — fixture setup/teardown ONLY. Never use this to assert RLS behavior, since it bypasses RLS entirely. */
export function serviceClient(): SupabaseClient<Database> {
  return createClient<Database>(url(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** A fresh, signed-in anon-key client — this is what RLS/RPCs actually see in production, so this is what tests should assert against. */
export async function signIn(
  email: string,
  password: string = SEED_PASSWORD,
): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(url(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      `Failed to sign in as ${email}: ${error.message}. Did you run "supabase db reset" / apply supabase/seed.sql?`,
    );
  }
  return client;
}

export async function getOrgIdBySlug(client: SupabaseClient<Database>, slug: string) {
  const { data, error } = await client.from("organizations").select("id").eq("slug", slug).single();
  if (error) throw error;
  return data.id;
}

export async function getPlanIdByName(
  client: SupabaseClient<Database>,
  organizationId: string,
  name: string,
) {
  const { data, error } = await client
    .from("plans")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", name)
    .single();
  if (error) throw error;
  return data.id;
}

export async function getScheduleCategoryIdByName(
  client: SupabaseClient<Database>,
  organizationId: string,
  name: string,
) {
  const { data, error } = await client
    .from("schedule_categories")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", name)
    .single();
  if (error) throw error;
  return data.id;
}

export async function getSlotId(
  client: SupabaseClient<Database>,
  organizationId: string,
  categoryId: string,
  dayOfWeek: number,
  startTime: string,
) {
  const { data, error } = await client
    .from("schedule_slots")
    .select("id, capacity")
    .eq("organization_id", organizationId)
    .eq("schedule_category_id", categoryId)
    .eq("day_of_week", dayOfWeek as DayOfWeek)
    .eq("start_time", startTime)
    .single();
  if (error) throw error;
  return data;
}

export async function getStudentIdByEmail(
  client: SupabaseClient<Database>,
  organizationId: string,
  email: string,
) {
  const { data, error } = await client
    .from("students")
    .select("id, profiles!inner(email)")
    .eq("organization_id", organizationId)
    .eq("profiles.email", email)
    .single();
  if (error) throw error;
  return data.id;
}

/** Next calendar date (today or later) whose day-of-week matches `dow` (0=Sun..6=Sat) — always a real, bookable future occurrence of a recurring slot. */
export function nextDateForDow(dow: number, fromOffsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + fromOffsetDays);
  const currentDow = d.getUTCDay();
  const diff = (dow - currentDow + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** A date guaranteed to be a Monday at least `weeksAhead` weeks out — used to keep tests from colliding with each other's bookings across repeated runs. */
export function farFutureMonday(weeksAhead: number): string {
  const base = nextDateForDow(1); // next Monday
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeksAhead * 7);
  return d.toISOString().slice(0, 10);
}

/**
 * Creates one throwaway STUDENT (auth user + membership + students row,
 * no subscription) via the admin API — test fixture only, not the app's
 * real invite flow (no email needed here). Callers add a subscription
 * separately once they know which plan to attach.
 */
export async function createThrowawayStudent(
  service: SupabaseClient<Database>,
  organizationId: string,
  email: string,
) {
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
  });
  if (createError || !created.user) throw createError ?? new Error("createUser failed");

  const { error: memberError } = await service.from("organization_members").insert({
    organization_id: organizationId,
    user_id: created.user.id,
    role: "STUDENT",
    status: "ACTIVE",
  });
  if (memberError) throw memberError;

  const { data: student, error: studentError } = await service
    .from("students")
    .insert({ organization_id: organizationId, profile_id: created.user.id })
    .select("id")
    .single();
  if (studentError) throw studentError;

  return { userId: created.user.id, studentId: student.id };
}

/** Throwaway schedule_category + schedule_slot, owner-created (RLS: OWNER/ADMIN write). */
export async function createThrowawaySlot(
  owner: SupabaseClient<Database>,
  organizationId: string,
  opts: { name: string; dayOfWeek: number; startTime: string; endTime: string; capacity: number },
) {
  const { data: category, error: categoryError } = await owner
    .from("schedule_categories")
    .insert({ organization_id: organizationId, name: opts.name })
    .select("id")
    .single();
  if (categoryError) throw categoryError;

  const { data: slot, error: slotError } = await owner
    .from("schedule_slots")
    .insert({
      organization_id: organizationId,
      schedule_category_id: category.id,
      day_of_week: opts.dayOfWeek as DayOfWeek,
      start_time: opts.startTime,
      end_time: opts.endTime,
      capacity: opts.capacity,
    })
    .select("id")
    .single();
  if (slotError) throw slotError;

  return { categoryId: category.id, slotId: slot.id };
}

/** Throwaway plan granting access to the given categories. */
export async function createThrowawayPlan(
  owner: SupabaseClient<Database>,
  organizationId: string,
  opts: {
    name: string;
    categoryIds: string[];
    sessionLimit: number;
    sessionPeriod: "WEEK" | "MONTH";
  },
) {
  const { data: plan, error: planError } = await owner
    .from("plans")
    .insert({
      organization_id: organizationId,
      name: opts.name,
      price: 0,
      session_limit: opts.sessionLimit,
      session_period: opts.sessionPeriod,
    })
    .select("id")
    .single();
  if (planError) throw planError;

  const { error: syncError } = await owner.rpc("sync_plan_categories", {
    p_plan_id: plan.id,
    p_category_ids: opts.categoryIds,
  });
  if (syncError) throw syncError;

  return plan.id;
}

/**
 * The date + time-of-day + day-of-week that a given `timeZone` (e.g. the
 * organization's) shows at `now + offsetMinutes`. `create_booking()`/
 * `cancel_booking()` interpret `bookings.date + schedule_slots.start_time`
 * in the ORGANIZATION's timezone (never UTC, never the test runner's own
 * timezone) — this is what lets tests construct "a class starting 10
 * minutes ago" (or similar) as a real, deterministic instant, whatever
 * timezone `npm test` happens to run in.
 */
export function pointInOrgTimezone(timeZone: string, offsetMinutes: number) {
  const instant = new Date(Date.now() + offsetMinutes * 60_000);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  return {
    date,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
    // Sun=0..Sat=6, matching the DB's day_of_week convention. Derived from
    // the formatted date (parsed as UTC noon) rather than the instant
    // directly, so it agrees with `date` above even right at a DST/midnight
    // boundary in `timeZone`.
    dayOfWeek: new Date(`${date}T12:00:00Z`).getUTCDay(),
  };
}

export const MF_STUDIO_TIMEZONE = "America/Sao_Paulo";
