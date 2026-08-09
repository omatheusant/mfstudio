"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchDisplayAgendaAction, fetchDisplayRosterAction } from "@/features/display/actions";
import type { DisplayRosterEntry, DisplaySlot } from "@/features/display/queries";
import { cn } from "@/lib/utils";

const REFRESH_MS = 20_000;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function OccupancyBar({ reserved, capacity }: { reserved: number; capacity: number }) {
  const total = Math.max(capacity, 1);
  const filled = Math.min(reserved, total);
  const blocks = Array.from({ length: total }, (_, i) => i < filled);

  return (
    <div className="flex gap-1">
      {blocks.map((isFilled, i) => (
        <span
          key={i}
          className={cn(
            "h-6 w-3 rounded-sm sm:h-8 sm:w-4",
            isFilled ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

const ROSTER_STATUS_LABEL: Record<DisplayRosterEntry["status"], string> = {
  RESERVED: "–",
  PRESENT: "✓",
  ABSENT: "✗",
};

export function DisplayBoard({
  slug,
  organizationName,
  initialSlots,
}: {
  slug: string;
  organizationName: string;
  initialSlots: DisplaySlot[];
}) {
  const [date] = useState(todayISO());
  const [slots, setSlots] = useState(initialSlots);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [roster, setRoster] = useState<DisplayRosterEntry[]>([]);
  const [now, setNow] = useState(() => new Date());

  const refreshAgenda = useCallback(async () => {
    const data = await fetchDisplayAgendaAction(slug, date);
    setSlots(data);
  }, [slug, date]);

  const refreshRoster = useCallback(
    async (slotId: string) => {
      const data = await fetchDisplayRosterAction(slug, slotId, date);
      setRoster(data);
    },
    [slug, date],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
      refreshAgenda();
      if (selectedSlotId) refreshRoster(selectedSlotId);
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshAgenda, refreshRoster, selectedSlotId]);

  function selectSlot(slotId: string) {
    setSelectedSlotId(slotId);
    refreshRoster(slotId);
  }

  const selectedSlot = slots.find((s) => s.slotId === selectedSlotId) ?? null;

  return (
    <div className="flex min-h-svh flex-col gap-6 bg-background p-6 sm:p-10">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{organizationName}</h1>
        <p className="text-lg text-muted-foreground sm:text-2xl tabular-nums">
          {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-muted-foreground sm:text-2xl">
            Aulas de hoje
          </h2>
          {slots.length === 0 ? (
            <p className="py-8 text-xl text-muted-foreground">Nenhuma aula hoje.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {slots.map((slot) => (
                <li key={slot.slotId}>
                  <button
                    onClick={() => selectSlot(slot.slotId)}
                    className={cn(
                      "flex w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition-colors sm:px-6 sm:py-4",
                      selectedSlotId === slot.slotId
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="text-xl font-semibold tabular-nums sm:text-3xl">
                        {slot.startTime.slice(0, 5)}
                      </span>
                      <span className="text-sm text-muted-foreground sm:text-lg">
                        {slot.categoryName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <OccupancyBar reserved={slot.reserved} capacity={slot.capacity} />
                      <span className="text-lg font-medium tabular-nums sm:text-2xl">
                        {slot.reserved}/{slot.capacity}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border p-4 sm:p-6">
          {selectedSlot ? (
            <>
              <h2 className="text-xl font-semibold sm:text-2xl">
                Aula das {selectedSlot.startTime.slice(0, 5)}
              </h2>
              {roster.length === 0 ? (
                <p className="mt-4 text-lg text-muted-foreground">Nenhuma reserva ainda.</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {roster.map((entry, i) => (
                    <li
                      key={`${entry.firstName}-${i}`}
                      className="flex items-center justify-between border-b py-2 text-lg sm:text-xl"
                    >
                      <span>{entry.firstName}</span>
                      <span
                        className={cn(
                          "font-semibold",
                          entry.status === "PRESENT" && "text-primary",
                          entry.status === "ABSENT" && "text-destructive",
                        )}
                      >
                        {ROSTER_STATUS_LABEL[entry.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-lg text-muted-foreground sm:text-xl">
              Selecione uma aula para ver os alunos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
