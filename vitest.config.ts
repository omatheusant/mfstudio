import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // These are integration tests against a real Postgres/Supabase
    // instance (RPCs, RLS, triggers) — generous timeouts, no mocking.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["tests/vitest.setup.ts"],
    // Fase 11's concurrency test (create_booking race) and the
    // fixture-creating tests share state within a file; running files in
    // parallel processes is fine (they use isolated fixtures), but keep
    // it to one worker to avoid hammering a free-tier Supabase project.
    fileParallelism: false,
  },
});
