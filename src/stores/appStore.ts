import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/api/axiosInstance";

interface AppState {
  appName: string;
  logoUrl: string | null;
  logoAppUrl: string | null;
  fetchAppInfo: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      appName: "Parc Auto",
      logoUrl: null,
      logoAppUrl: null,

      fetchAppInfo: async () => {
        try {
          const res = await api.get("/app-info");
          set({
            appName: res.data.app_name ?? "Parc Auto",
            logoUrl: res.data.logo_url ?? null,
            logoAppUrl: res.data.logo_app_url ?? null,
          });
        } catch {
          // Garder les valeurs par défaut
        }
      },
    }),
    {
      name: "parc-app-info",
      partialize: (s) => ({
        appName: s.appName,
        logoUrl: s.logoUrl,
        logoAppUrl: s.logoAppUrl,
      }),
    },
  ),
);
