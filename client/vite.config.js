import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API has no CORS and a sameSite=strict refresh cookie, so the dev server
// proxies /api to Express and the browser sees one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:3000", changeOrigin: false } },
  },
  preview: {
    proxy: { "/api": { target: "http://localhost:3000", changeOrigin: false } },
  },
});
