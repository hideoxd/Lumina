import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [sveltekit()],
  clearScreen: false,
  resolve: {
    alias: {
      "jsmediatags": "jsmediatags/dist/jsmediatags.min.js"
    }
  },
  server: {
    port: 1420,
    strictPort: false,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  optimizeDeps: {
    exclude: ['sql.js'],
  },
});
