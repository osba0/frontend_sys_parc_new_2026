import api from "./axiosInstance";
import type {
  Maintenance,
  Carburant,
  DotationCarburant,
  DocumentVehicule,
  BonCommande,
  Alerte,
  PaginatedResponse,
  ApiResponse,
  Fournisseur,
  FournisseurIntervention,
  FournisseurStats,
} from "@/types";

// ============================================================
// Maintenances
// ============================================================
export const maintenancesApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Maintenance>>("/maintenances", { params }),

  stats: (params?: { annee?: number; agence_id?: number }) =>
    api.get("/maintenances/stats", { params }),

  planifiees: (params?: object) =>
    api.get("/maintenances/planifiees", { params }),

  get: (id: number) => api.get<ApiResponse<Maintenance>>(`/maintenances/${id}`),

  create: (data: object) =>
    api.post<ApiResponse<Maintenance>>("/maintenances", data),

  update: (id: number, data: object) =>
    api.put<ApiResponse<Maintenance>>(`/maintenances/${id}`, data),

  delete: (id: number) => api.delete(`/maintenances/${id}`),

  approuver: (id: number) =>
    api.post<ApiResponse<Maintenance>>(`/maintenances/${id}/approuver`),

  cloturer: (id: number, data: object) =>
    api.post<ApiResponse<Maintenance>>(`/maintenances/${id}/cloturer`, data),
};

// ============================================================
// Carburant
// ============================================================
export const carburantApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Carburant>>("/carburant", { params }),

  kpi: (params?: { debut?: string; fin?: string; agence_id?: number }) =>
    api.get<ApiResponse<any>>("/carburant/kpi", { params }),

  stats: (params?: { annee?: number; agence_id?: number }) =>
    api.get("/carburant/stats", { params }),

  get: (id: number) => api.get<ApiResponse<Carburant>>(`/carburant/${id}`),

  create: (data: object) =>
    api.post<ApiResponse<Carburant>>("/carburant", data),

  update: (id: number, data: object) =>
    api.put<ApiResponse<Carburant>>(`/carburant/${id}`, data),

  delete: (id: number) => api.delete(`/carburant/${id}`),

  dotations: (params?: object) =>
    api.get<ApiResponse<DotationCarburant[]>>("/carburant/dotations", {
      params,
    }),

  creerDotation: (data: object) => api.post("/carburant/dotations", data),

  updateDotation: (id: number, data: object) =>
    api.put(`/carburant/dotations/${id}`, data),
};

// ============================================================
// Documents
// ============================================================
export const documentsApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<DocumentVehicule>>("/documents", { params }),

  expirationProchaine: (params?: { jours?: number }) =>
    api.get("/documents/expiration-prochaine", { params }),

  get: (id: number) =>
    api.get<ApiResponse<DocumentVehicule>>(`/documents/${id}`),

  create: (data: FormData | object) => {
    const isFormData = data instanceof FormData;
    return api.post<ApiResponse<DocumentVehicule>>("/documents", data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
  },

  update: (id: number, data: object) =>
    api.put<ApiResponse<DocumentVehicule>>(`/documents/${id}`, data),

  delete: (id: number) => api.delete(`/documents/${id}`),

  renouveler: (id: number, data: FormData | object) => {
    const isFormData = data instanceof FormData;
    return api.post<ApiResponse<DocumentVehicule>>(
      `/documents/${id}/renouveler`,
      data,
      {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
      },
    );
  },
};

// ============================================================
// Bons de Commande
// ============================================================
export const bonsCommandeApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<BonCommande>>("/bons-commande", { params }),

  get: (id: number) =>
    api.get<ApiResponse<BonCommande>>(`/bons-commande/${id}`),

  create: (data: object) =>
    api.post<ApiResponse<BonCommande>>("/bons-commande", data),

  update: (id: number, data: object) =>
    api.put<ApiResponse<BonCommande>>(`/bons-commande/${id}`, data),

  delete: (id: number) => api.delete(`/bons-commande/${id}`),

  soumettre: (id: number) =>
    api.post<ApiResponse<BonCommande>>(`/bons-commande/${id}/soumettre`),

  approuver: (id: number) =>
    api.post<ApiResponse<BonCommande>>(`/bons-commande/${id}/approuver`),

  rejeter: (id: number, data: { motif: string }) =>
    api.post<ApiResponse<BonCommande>>(`/bons-commande/${id}/rejeter`, data),

  executer: (id: number, data?: { date_livraison_reelle?: string }) =>
    api.post<ApiResponse<BonCommande>>(
      `/bons-commande/${id}/executer`,
      data ?? {},
    ),
};

// ============================================================
// Fournisseurs
// ============================================================
export const fournisseursApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Fournisseur>>("/fournisseurs", { params }),

  get: (id: number) => api.get<ApiResponse<Fournisseur>>(`/fournisseurs/${id}`),

  create: (data: object) =>
    api.post<ApiResponse<Fournisseur>>("/fournisseurs", data),

  update: (id: number, data: object) =>
    api.put<ApiResponse<Fournisseur>>(`/fournisseurs/${id}`, data),

  delete: (id: number) => api.delete(`/fournisseurs/${id}`),

  interventions: (id: number, params?: object) =>
    api.get<PaginatedResponse<FournisseurIntervention>>(
      `/fournisseurs/${id}/interventions`,
      { params },
    ),

  stats: (id: number, params?: object) =>
    api.get<ApiResponse<FournisseurStats>>(`/fournisseurs/${id}/stats`, {
      params,
    }),

  uploadLogo: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("logo", file);
    return api.post<ApiResponse<Fournisseur>>(`/fournisseurs/${id}/logo`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteLogo: (id: number) =>
    api.delete<ApiResponse<Fournisseur>>(`/fournisseurs/${id}/logo`),
};

// ============================================================
// Alertes
// ============================================================
export const alertesApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Alerte>>("/alertes", { params }),

  nonLues: () => api.get("/alertes/non-lues"),

  marquerLue: (id: number) => api.put(`/alertes/${id}/lue`),

  marquerToutesLues: () => api.post("/alertes/marquer-toutes-lues"),
};

// ============================================================
// Dashboard
// ============================================================
export const dashboardApi = {
  stats: (mois?: number, annee?: number) =>
    api.get("/dashboard/stats", { params: { mois, annee } }),

  alertesActives: () => api.get("/dashboard/alertes-actives"),

  activiteRecente: (limit?: number) =>
    api.get("/dashboard/activite-recente", { params: { limit } }),

  kpiMensuel: (annee?: number) =>
    api.get("/dashboard/kpi-mensuel", { params: { annee } }),

  topVehicules: (annee?: number) =>
    api.get("/dashboard/top-vehicules", { params: { annee } }),
};

// ============================================================
// Rapports & Exports
// ============================================================
export const rapportsApi = {
  maintenance: (params?: object) =>
    api.get("/rapports/maintenance", { params }),

  carburant: (params?: object) => api.get("/rapports/carburant", { params }),

  tco: (params?: object) => api.get("/rapports/tco", { params }),

  axes: (params?: { annee?: number; agence_id?: number }) =>
    api.get("/rapports/axes", { params }),

  // PDF
  pdfSignalement: (id: number) =>
    api.get(`/rapports/pdf/signalement/${id}`, { responseType: "blob" }),

  pdfChecklist: (id: number) =>
    api.get(`/rapports/pdf/checklist/${id}`, { responseType: "blob" }),

  pdfAffectation: (id: number) =>
    api.get(`/rapports/pdf/affectation/${id}`, { responseType: "blob" }),

  pdfBonCommande: (id: number) =>
    api.get(`/rapports/pdf/bon-commande/${id}`, { responseType: "blob" }),

  pdfVehicule: (id: number, annee?: number) =>
    api.get(`/rapports/pdf/vehicule/${id}`, {
      params: { annee },
      responseType: "blob",
    }),

  // Excel
  excelMaintenance: (params?: object) =>
    api.get("/rapports/excel/maintenance", { params, responseType: "blob" }),

  excelCarburant: (params?: object) =>
    api.get("/rapports/excel/carburant", { params, responseType: "blob" }),

  excelBonsCommande: (params?: object) =>
    api.get("/rapports/excel/bons-commande", { params, responseType: "blob" }),

  excelParcGlobal: (params?: object) =>
    api.get("/rapports/excel/parc-global", { params, responseType: "blob" }),
};

// ============================================================
// Agences (select RBAC-safe — endpoint public pour tous les rôles)
// ============================================================
export const agencesApi = {
  // Route publique (auth only) — accessible à tous les rôles
  list: (params?: { per_page?: number; est_active?: boolean }) =>
    api.get("/agences", { params: { per_page: 100, ...params } }),
};

// ============================================================
// Axes de livraison (select pour formulaires)
// ============================================================
export const axesLivraisonApi = {
  list: (params?: {
    per_page?: number;
    "filter[agence_id]"?: number | string;
    "filter[est_actif]"?: boolean;
  }) => api.get("/axes-livraison", { params: { per_page: 100, ...params } }),
};
