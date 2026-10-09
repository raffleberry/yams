import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// The Go binary embeds `ui/dist` and serves it under an optional -prefix.
// Assets are emitted with relative URLs so the runtime <base href> injected by
// the server resolves them correctly behind any sub-path.
export default defineConfig({
  base: "./",
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["vue", "vue-router", "pinia"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Point these at the address in ~/.yams/config.json.
      "/api": {
        target: "http://127.0.0.1:5550",
        changeOrigin: true,
      },
    },
  },
});
