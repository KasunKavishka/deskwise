import { defineConfig, devices } from "@playwright/test";

const requiredEnvironment = [
  "E2E_SUPABASE_URL",
  "E2E_SUPABASE_PUBLISHABLE_KEY",
  "E2E_SUPABASE_SERVICE_ROLE_KEY",
  "E2E_ADMIN_SETUP_SECRET",
] as const;

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(
      `Missing ${name}. Configure a dedicated, disposable Supabase project before running E2E tests.`,
    );
  }
}

if (process.env.E2E_ADMIN_SETUP_SECRET!.length < 32) {
  throw new Error("E2E_ADMIN_SETUP_SECRET must contain at least 32 characters.");
}

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.E2E_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.E2E_SUPABASE_PUBLISHABLE_KEY!,
      SUPABASE_SERVICE_ROLE_KEY: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!,
      ADMIN_SETUP_SECRET: process.env.E2E_ADMIN_SETUP_SECRET!,
    },
  },
});
