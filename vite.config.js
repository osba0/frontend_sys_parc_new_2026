var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    // Charger les variables .env du mode courant (development/production)
    // pour les utiliser dans la config Vite elle-même
    var env = loadEnv(mode, process.cwd(), "VITE_");
    // Port Vite : VITE_PORT dans .env ou 5173 par défaut
    var port = parseInt((_b = env.VITE_PORT) !== null && _b !== void 0 ? _b : "5173", 10);
    // Cible du proxy : si VITE_API_URL est défini on n'utilise pas le proxy
    // (les requêtes partent directement vers l'URL externe)
    var useProxy = !env.VITE_API_URL;
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
        server: __assign({ 
            // Port fixe — évite l'auto-incrément vers 5174, 5175…
            // Si le port est occupé, Vite affichera une erreur claire
            port: port, strictPort: true }, (useProxy && {
            proxy: {
                "/api": {
                    target: "http://127.0.0.1:8000",
                    changeOrigin: true,
                    secure: false,
                    // Log des requêtes proxifiées en mode debug
                    configure: function (proxy) {
                        proxy.on("error", function (err) {
                            console.error("[proxy] Erreur :", err.message);
                            console.error("[proxy] Vérifiez que Laravel tourne sur http://127.0.0.1:8000");
                        });
                        proxy.on("proxyReq", function (_proxyReq, req) {
                            if (env.VITE_API_DEBUG === "true") {
                                console.debug("[proxy]", req.method, req.url, "→ :8000");
                            }
                        });
                    },
                },
            },
        })),
        // ── Preview (npm run preview) ───────────────────────────
        preview: {
            port: port,
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
