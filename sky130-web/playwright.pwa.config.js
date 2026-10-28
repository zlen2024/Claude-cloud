import { defineConfig } from "@playwright/test";

// Ujian PWA perlu build produksi (service worker hanya didaftar dalam PROD).
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: "e2e-pwa",
  timeout: 120000,
  workers: 1,
  use: { baseURL: "http://localhost:4173", launchOptions: { executablePath } },
  webServer: {
    command: "npm run build && npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
