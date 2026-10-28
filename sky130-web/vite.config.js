import { defineConfig } from "vite";

// base "./" supaya hasil build boleh di-host di mana-mana (GitHub Pages, dll.)
export default defineConfig({
  base: "./",
  build: { chunkSizeWarningLimit: 30000 },
  test: {
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/measure.js", "src/expr.js", "src/signals.js"],
      thresholds: { lines: 90, statements: 90, functions: 90 },
    },
  },
});
