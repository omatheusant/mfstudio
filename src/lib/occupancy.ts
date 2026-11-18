/**
 * Shared occupancy color scale for schedule slots. Introduced because
 * capacity was only ever shown as a plain number ("8/10") — owner and
 * students had to do the math themselves to notice a class filling up.
 * Centralized here so the dashboard, agenda, student booking screen, and
 * TV display all escalate at the same thresholds.
 */
export type OccupancyTone = "open" | "filling" | "full";

export function getOccupancyTone(reserved: number, capacity: number): OccupancyTone {
  if (capacity <= 0) return "open";
  const ratio = reserved / capacity;
  if (ratio >= 1) return "full";
  if (ratio >= 0.7) return "filling";
  return "open";
}

export const OCCUPANCY_INDICATOR_CLASS: Record<OccupancyTone, string> = {
  open: "bg-primary",
  filling: "bg-amber-500 dark:bg-amber-400",
  full: "bg-destructive",
};

export const OCCUPANCY_TEXT_CLASS: Record<OccupancyTone, string> = {
  open: "text-muted-foreground",
  filling: "text-amber-700 dark:text-amber-400",
  full: "text-destructive",
};
