import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      // Proxy /api/dspace to the DSpace backend (port 8080)
      "/api/dspace": {
        target: "http://localhost:8080",
        changeOrigin: false,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/dspace/, "/server/api"),
        configure: (proxy, _options) => {
          proxy.on("proxyRes", (proxyRes, req, res) => {
            const setCookie = proxyRes.headers["set-cookie"];
            if (setCookie) {
              proxyRes.headers["set-cookie"] = setCookie.map((cookie) => {
                return cookie.replace(/Path=\/server/gi, "Path=/");
              });
            }
          });
        },
      },
      // Proxy other /api calls to the Django backend (port 8000)
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
