import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET;

  const proxy = proxyTarget
    ? {
        "/guest": { target: proxyTarget, changeOrigin: true },
        "/admin": { target: proxyTarget, changeOrigin: true },
      }
    : undefined;

  return {
    plugins: [react()],
    base: "",
    build: {
      rollupOptions: {
        input: {
          main: "index.html",
          admin: "admin.html",
        },
      },
    },
    server: proxy ? { proxy } : undefined,
  };
});
