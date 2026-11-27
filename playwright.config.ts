import { defineConfig, devices } from "@playwright/test";
import { supabaseLocal } from "./e2e/supabase";

// Pruebas de punta a punta contra la app compilada y un Supabase local real
// (Postgres con todas las migraciones). Antes: npm run db:start
const PUERTO = 3100;
const db = supabaseLocal();

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    ...devices["Pixel 7"],
    locale: "es-CO",
    timezoneId: "America/Bogota",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && npx next start -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      SUPABASE_URL: db.url,
      SUPABASE_SERVICE_ROLE_KEY: db.serviceRoleKey,
      SUPABASE_ANON_KEY: db.anonKey,
    },
  },
});
