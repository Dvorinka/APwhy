import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const apiPort = process.env.APWHY_PORT || process.env.DASHBOARD_API_PORT || "3001";
const uiBasePath = normalizeBasePath(process.env.VITE_BASE_PATH || "/");

export default defineConfig({
  root: "web",
  base: uiBasePath,
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

function normalizeBasePath(value: string): string {
  const raw = value.trim();
  if (!raw || raw === "/") return "/";
  const withLeading = raw.startsWith("/") ? raw : `/${raw}`;
  const withoutTrailing = withLeading.replace(/\/+$/, "");
  return `${withoutTrailing}/`;
}
