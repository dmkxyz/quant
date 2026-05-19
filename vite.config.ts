import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_PATH || "/";
  const appName = env.VITE_APP_NAME || "Quant";

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "apple-touch-icon.svg"],
        manifest: {
          name: appName,
          short_name: appName,
          description: "Daily quant interview drills with adaptive coaching.",
          theme_color: "#00ff88",
          background_color: "#030705",
          display: "standalone",
          orientation: "portrait",
          scope: base,
          start_url: base,
          icons: [
            {
              src: "pwa-192x192.svg",
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "any maskable"
            },
            {
              src: "pwa-512x512.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any maskable"
            }
          ]
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,json}"],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.includes("/rest/v1/"),
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-read-cache",
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 7
                }
              }
            }
          ]
        }
      })
    ],
    test: {
      environment: "jsdom",
      setupFiles: "./vitest.setup.ts",
      exclude: ["tests/e2e/**", "node_modules/**", "dist/**"]
    }
  };
});
