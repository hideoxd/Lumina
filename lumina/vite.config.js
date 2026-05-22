import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [sveltekit()],
  clearScreen: false,
  resolve: {
    alias: {
      // The "browser" field in jsmediatags/package.json points to
      // dist/jsmediatags.js which doesn't exist in the npm package
      // (only dist/jsmediatags.min.js exists). The build2/ CJS entry
      // requires Node's 'fs' module. So we use the minified UMD bundle
      // which is fully browser-safe.
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
    include: ['sql.js'],
  },
});
