import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    vue({
      customElement: /\.ce\.vue$/,
    }),
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": resolve("ce-src"),
      "@generated": resolve("generated/runtime"),
    },
  },
});
