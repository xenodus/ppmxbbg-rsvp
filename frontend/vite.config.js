import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET;

  return {
    plugins: [react()],
    base: "",
    server: proxyTarget
      ? {
          proxy: {
            "/invite": {
              target: proxyTarget,
              changeOrigin: true,
            },
            "/guest": {
              target: proxyTarget,
              changeOrigin: true,
            },
          },
        }
      : undefined,
  };
});
