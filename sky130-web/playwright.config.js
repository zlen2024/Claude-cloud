import { defineConfig } from "@playwright/test";

// PW_CHROMIUM boleh set untuk guna binary chromium sedia ada (contoh dalam container).
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: "e2e",
  timeout: 90000,
  use: { baseURL: "http://localhost:5173", launchOptions: { executablePath } },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
