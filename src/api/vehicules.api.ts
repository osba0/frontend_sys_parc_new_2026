import api from "./axiosInstance";
import type { Vehicule, PaginatedResponse, ApiResponse } from "@/types";

// Spatie QueryBuilder attend filter[key] pour les filtres
// et les paramètres directs (page, per_page, sort, include) sans préfixe
export interface VehiculeFilters {
  page?: number;
  per_page?: number;
  sort?: string;
  include?: string;
  // Filtres Spatie — doivent être nommés filter[key]
  "filter[agence_id]"?: number | string;
  "filter[statut]"?: string;
  "filter[type_vehicule]"?: string;
  "filter[immatriculation]"?: string;
  "filter[marque]"?: string;
  "filter[modele]"?: string;
  // Filtres scope — alertes documentaires
  "filter[vt_prochaine]"?: number; // nb jours (ex: 30)
  "filter[assurance_prochaine]"?: number; // nb jours (ex: 30)
  "filter[entretien_du]"?: number; // 1 = actif
}

export const vehiculesApi = {
  list: (params?: VehiculeFilters) =>
    api.get<PaginatedResponse<Vehicule>>("/vehicules", { params }),

  get: (id: number, include?: string) =>
    api.get<ApiResponse<Vehicule>>(`/vehicules/${id}`, { params: { include } }),

  create: (data: Partial<Vehicule>) =>
    api.post<ApiResponse<Vehicule>>("/vehicules", data),

  update: (id: number, data: Partial<Vehicule>) =>
    api.put<ApiResponse<Vehicule>>(`/vehicules/${id}`, data),

  delete: (id: number) => api.delete(`/vehicules/${id}`),

  updateKilometrage: (id: number, kilometrage: number) =>
    api.put<
      ApiResponse<{
        vehicule: Vehicule;
        km_precedent: number;
        km_nouveau: number;
      }>
    >(`/vehicules/${id}/kilometrage`, { kilometrage }),

  tco: (id: number, annee?: number) =>
    api.get(`/vehicules/${id}/tco`, { params: { annee } }),

  maintenances: (id: number, params?: object) =>
    api.get(`/vehicules/${id}/maintenances`, { params }),

  carburant: (id: number, params?: object) =>
    api.get(`/vehicules/${id}/carburant`, { params }),

  documents: (id: number) => api.get(`/vehicules/${id}/documents`),

  checklists: (id: number, params?: object) =>
    api.get(`/vehicules/${id}/checklists`, { params }),

  signalements: (id: number, params?: object) =>
    api.get(`/vehicules/${id}/signalements`, { params }),

  affectations: (id: number, params?: object) =>
    api.get(`/vehicules/${id}/affectations`, { params }),

  alertes: (id: number) => api.get(`/vehicules/${id}/alertes`),

  photos: (id: number) => api.get<any>(`/vehicules/${id}/photos`),

  uploadPhotos: (id: number, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("photos[]", f));
    return api.post<any>(`/vehicules/${id}/photos`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deletePhoto: (vehiculeId: number, mediaId: number) =>
    api.delete(`/vehicules/${vehiculeId}/photos/${mediaId}`),

  setPhotoPrincipale: (vehiculeId: number, mediaId: number) =>
    api.put(`/vehicules/${vehiculeId}/photos/${mediaId}/principale`),

  ficheVie: (vehiculeId: number, debut: string, fin: string) =>
    api.get<{ data: any }>(`/vehicules/${vehiculeId}/fiche-vie`, {
      params: { debut, fin },
    }),

  ficheVieExcel: (vehiculeId: number, debut: string, fin: string) =>
    api.get(`/vehicules/${vehiculeId}/fiche-vie/excel`, {
      params: { debut, fin },
      responseType: "blob",
    }),
};
