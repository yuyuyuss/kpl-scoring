import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// KPL 官方接口必须的请求头（Referer/Origin 防盗链）
const KPL_HEADERS = {
  "Content-Type": "application/json",
  Referer: "http://kpl.qq.com/",
  Origin: "http://kpl.qq.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
  Accept: "application/json, text/plain, */*",
};

const KPL_BASE = "https://kplshop-op.timi-esports.qq.com";

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 项目站点使用相对路径
  base: "./",
  build: {
    sourcemap: "hidden",
    outDir: "dist",
  },
  plugins: [
    react({
      babel: {
        plugins: ["react-dev-locator"],
      },
    }),
    tsconfigPaths(),
  ],
  server: {
    proxy: {
      // 开发态代理：将 /api/kpl/* 转发到 KPL 官方接口并注入请求头
      "/api/kpl": {
        target: KPL_BASE,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kpl/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            Object.entries(KPL_HEADERS).forEach(([k, v]) => {
              proxyReq.setHeader(k, v);
            });
          });
        },
      },
    },
  },
});
