import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/api/axiosInstance";

export interface ConfigEntreprise {
  nom: string;
  ninea: string | null;
  rc: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  site_web: string | null;
  logo_url: string | null; // logo entreprise (Topbar, PDF)
  logo_app_url: string | null; // logo application (Sidebar)
  couleur_1: string;
  couleur_2: string;
  couleur_3: string;
  notes: string | null;
  chauffeur_peut_saisir_carburant: boolean;
}

interface ConfigState {
  config: ConfigEntreprise | null;
  loading: boolean;
  fetchConfig: () => Promise<void>;
  setConfig: (c: ConfigEntreprise) => void;
}

const DEFAULT_CONFIG: ConfigEntreprise = {
  nom: "Parc Auto",
  ninea: null,
  rc: null,
  adresse: null,
  telephone: null,
  email: null,
  site_web: null,
  logo_url: null,
  logo_app_url: null,
  couleur_1: "#1E3A5F",
  couleur_2: "#2E86C1",
  couleur_3: "#1ABC9C",
  notes: null,
  chauffeur_peut_saisir_carburant: false,
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: null,
      loading: false,

      fetchConfig: async () => {
        set({ loading: true });
        try {
          const res = await api.get("/admin/config");
          set({ config: res.data.data, loading: false });
        } catch {
          set({ config: DEFAULT_CONFIG, loading: false });
        }
      },

      setConfig: (c) => set({ config: c }),
    }),
    {
      name: "parc-config",
      partialize: (s) => ({ config: s.config }),
    },
  ),
);
