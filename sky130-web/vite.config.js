import { defineConfig } from "vite";

// base "./" supaya hasil build boleh di-host di mana-mana (GitHub Pages, dll.)
export default defineConfig({
  base: "./",
  build: { chunkSizeWarningLimit: 30000 },
});
