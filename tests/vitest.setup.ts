import { config } from "dotenv";

// Reuse the same .env.local the Next.js app itself reads — no separate
// test env file to keep in sync.
config({ path: ".env.local" });

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `\n\nFase 11 tests need a real Supabase project with migrations + seed applied.\n` +
      `Missing in .env.local: ${missing.join(", ")}.\n` +
      `See README.md "Testes" for setup instructions. These are integration\n` +
      `tests — they are never run automatically in CI/build, only via "npm test".\n`,
  );
}
