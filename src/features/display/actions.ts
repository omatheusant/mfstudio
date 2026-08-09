"use server";

import { getDisplayAgenda, getDisplayRoster } from "@/features/display/queries";

/**
 * Thin "use server" wrappers so the (unauthenticated) client-side polling
 * in display-board.tsx can call them directly. No auth check here on
 * purpose — this whole screen is public; see 20260808190001_rpc_display.sql
 * for where the actual data minimization happens.
 */

export async function fetchDisplayAgendaAction(slug: string, date: string) {
  return getDisplayAgenda(slug, date);
}

export async function fetchDisplayRosterAction(slug: string, slotId: string, date: string) {
  return getDisplayRoster(slug, slotId, date);
}
