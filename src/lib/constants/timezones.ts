/**
 * Small curated list for the timezone <select>. The database column
 * accepts any IANA name (no CHECK constraint on it) — this list is just a
 * convenience for the settings form, not a hard limit.
 */
export const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "Brasília (America/Sao_Paulo)" },
  { value: "America/Manaus", label: "Manaus (America/Manaus)" },
  { value: "America/Rio_Branco", label: "Rio Branco (America/Rio_Branco)" },
  { value: "America/Noronha", label: "Fernando de Noronha (America/Noronha)" },
];

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";
