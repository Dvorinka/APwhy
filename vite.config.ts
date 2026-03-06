import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const apiPort = process.env.APWHY_PORT || process.env.DASHBOARD_API_PORT || "3001";

export default defineConfig({
  root: "web",
  base: "/",
  plugins: [solid()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
      "/health": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "esnext",
    outDir: "../internal/api/static",
    emptyOutDir: true,
  },
});
