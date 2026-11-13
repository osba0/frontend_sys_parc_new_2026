import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL, API_TIMEOUT, API_DEBUG } from "@/config";

/**
 * Instance Axios centrale.
 *
 * baseURL est résolu depuis src/config/index.ts :
 *   - dev sans VITE_API_URL → "/api/v1"  (proxy Vite → port 8000)
 *   - prod                  → "https://api.parcauto.sn/api/v1"
 *
 * Ne jamais hardcoder d'URL ici — utiliser les variables .env.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: API_TIMEOUT,
});

// ── Intercepteur requête — injecte le Bearer token ───────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Token Sanctum depuis Zustand (persisté en localStorage)
    const stored = localStorage.getItem("parc-auto-auth");
    if (stored) {
      try {
        const { state } = JSON.parse(stored) as { state?: { token?: string } };
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch {
        // JSON corrompu — ignorer silencieusement
      }
    }

    if (API_DEBUG) {
      console.debug(
        `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
        config.params ?? "",
      );
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Intercepteur réponse — gestion globale des erreurs ───────
api.interceptors.response.use(
  (response) => response,

  (
    error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>,
  ) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    // Pas de réponse = réseau coupé ou serveur inaccessible
    if (!error.response) {
      toast.error("Serveur inaccessible. Vérifiez votre connexion.");
      return Promise.reject(error);
    }

    switch (status) {
      case 401:
        localStorage.removeItem("parc-auto-auth");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        break;

      case 403:
        toast.error("Accès refusé. Permissions insuffisantes.");
        break;

      case 422:
        // Erreurs de validation — gérées localement dans les formulaires
        break;

      case 429:
        toast.error("Trop de requêtes. Veuillez patienter quelques instants.");
        break;

      case 500:
      case 502:
      case 503:
        toast.error("Erreur serveur. Veuillez réessayer.");
        break;

      default:
        if (status && status >= 400 && message && status !== 404) {
          toast.error(message);
        }
    }

    return Promise.reject(error);
  },
);

export default api;
