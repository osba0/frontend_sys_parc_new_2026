import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  // Charger les variables .env du mode courant (development/production)
  // pour les utiliser dans la config Vite elle-même
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // Port Vite : VITE_PORT dans .env ou 5173 par défaut
  const port = parseInt(env.VITE_PORT ?? "5173", 10);

  // Cible du proxy : si VITE_API_URL est défini on n'utilise pas le proxy
  // (les requêtes partent directement vers l'URL externe)
  const useProxy = !env.VITE_API_URL;

  return {
    plugins: [react()],

    // ── Résolution des alias ────────────────────────────────
    resolve: {
      alias: {
        // @ → src/  (utilisé dans tous les imports du projet)
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },

    // ── Serveur de développement ────────────────────────────
    server: {
      // Port fixe — évite l'auto-incrément vers 5174, 5175…
      // Si le port est occupé, Vite affichera une erreur claire
      port,
      strictPort: true,

      // Proxy activé uniquement si VITE_API_URL n'est pas défini
      // → en dev local, toutes les requêtes /api/* sont redirigées
      //   vers Laravel sur 8000, sans problème de CORS
      ...(useProxy && {
        proxy: {
          "/api": {
            target: "http://127.0.0.1:8000",
            changeOrigin: true,
            secure: false,
            // Log des requêtes proxifiées en mode debug
            configure: (proxy) => {
              proxy.on("error", (err) => {
                console.error("[proxy] Erreur :", err.message);
                console.error(
                  "[proxy] Vérifiez que Laravel tourne sur http://127.0.0.1:8000",
                );
              });
              proxy.on("proxyReq", (_proxyReq, req) => {
                if (env.VITE_API_DEBUG === "true") {
                  console.debug("[proxy]", req.method, req.url, "→ :8000");
                }
              });
            },
          },
        },
      }),
    },

    // ── Preview (npm run preview) ───────────────────────────
    preview: {
      port,
      strictPort: true,
    },

    // ── Build production ────────────────────────────────────
    build: {
      outDir: "dist",
      sourcemap: false,
      // Avertissement si un chunk dépasse 600 Ko
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Code splitting par librairie
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "query-vendor": ["@tanstack/react-query"],
            "chart-vendor": ["recharts"],
            "form-vendor": ["react-hook-form", "zod", "@hookform/resolvers"],
            "ui-vendor": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
            ],
          },
        },
      },
    },
  };
});
