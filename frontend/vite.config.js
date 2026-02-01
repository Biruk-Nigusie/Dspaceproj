import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [react(), tailwindcss()],
		server: {
			port: 3000,
			host: true,
			proxy: {
				// Proxy /api/dspace to the DSpace backend (port 8080)
				"/api/dspace": {
					target: env.VITE_DSPACE_API_URL || "http://localhost:8080",
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
					target: env.VITE_DJANGO_API_URL || "http://localhost:8000",
					changeOrigin: true,
					secure: false,
				},
			},
		},
	};
});
