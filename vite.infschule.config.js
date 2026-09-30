import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

// Builds the interactive learning widgets as a single Vue Custom Elements
// bundle for embedding in inf-schule content pages. Separate from the main
// vite.config.js, which builds the self-hosted site (index.html) instead.
export default defineConfig({
  plugins: [
    vue({
      customElement: /\.ce\.vue$/,
    }),
  ],
  build: {
    lib: {
      entry: resolve("ce-src/feature-main.js"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "dist-infschule",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve("ce-src"),
      "@generated": resolve("generated/runtime"),
    },
  },
});
