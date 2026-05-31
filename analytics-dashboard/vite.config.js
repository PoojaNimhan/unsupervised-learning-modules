import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [vue()],
  server: {
    host: "127.0.0.1",
    port: 5174,
  },
  build: {
    outDir: "../dist-analytics-dashboard",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
