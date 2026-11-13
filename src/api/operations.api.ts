import api from "./axiosInstance";
import type {
  Chauffeur,
  Affectation,
  Checklist,
  Signalement,
  PaginatedResponse,
  ApiResponse,
} from "@/types";

// ============================================================
// Chauffeurs
// ============================================================
export const chauffeursApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Chauffeur>>("/chauffeurs", { params }),

  get: (id: number) => api.get<ApiResponse<Chauffeur>>(`/chauffeurs/${id}`),

  create: (data: Partial<Chauffeur> | FormData) =>
    api.post<ApiResponse<Chauffeur>>("/chauffeurs", data, {
      headers:
        data instanceof FormData
          ? { "Content-Type": "multipart/form-data" }
          : { "Content-Type": "application/json" },
    }),

  update: (id: number, data: Partial<Chauffeur>) =>
    api.put<ApiResponse<Chauffeur>>(`/chauffeurs/${id}`, data),

  // Mise à jour avec fichier — POST + _method=PUT (method spoofing)
  // car PHP ne supporte pas multipart/form-data sur PUT
  updateMultipart: (id: number, fd: FormData) =>
    api.post<ApiResponse<Chauffeur>>(`/chauffeurs/${id}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  delete: (id: number) => api.delete(`/chauffeurs/${id}`),

  vehiculeActuel: (id: number) => api.get(`/chauffeurs/${id}/vehicule-actuel`),

  historique: (id: number, params?: object) =>
    api.get(`/chauffeurs/${id}/historique`, { params }),
};

// ============================================================
// Affectations
// ============================================================
export const affectationsApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Affectation>>("/affectations", { params }),

  actives: (params?: object) =>
    api.get<ApiResponse<{ total: number; affectations: Affectation[] }>>(
      "/affectations/actives",
      { params },
    ),

  get: (id: number) => api.get<ApiResponse<Affectation>>(`/affectations/${id}`),

  create: (data: object) =>
    api.post<ApiResponse<Affectation>>("/affectations", data),

  update: (id: number, data: object) =>
    api.put<ApiResponse<Affectation>>(`/affectations/${id}`, data),

  cloturer: (
    id: number,
    data: { kilometrage_fin: number; date_fin?: string; notes?: string },
  ) => api.post<ApiResponse<Affectation>>(`/affectations/${id}/cloturer`, data),
};

// ============================================================
// Checklists
// ============================================================
export const checklistsApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Checklist>>("/checklists", { params }),

  get: (id: number) => api.get<ApiResponse<Checklist>>(`/checklists/${id}`),

  create: (data: object) =>
    api.post<ApiResponse<Checklist>>("/checklists", data),

  update: (id: number, data: object) =>
    api.put<ApiResponse<Checklist>>(`/checklists/${id}`, data),

  soumettre: (id: number) =>
    api.post<ApiResponse<Checklist>>(`/checklists/${id}/soumettre`),

  valider: (id: number, data: { commentaire?: string }) =>
    api.post(`/checklists/${id}/valider`, data),

  rejeter: (id: number, data: { motif: string }) =>
    api.post(`/checklists/${id}/rejeter`, data),
};

// ============================================================
// Signalements
// ============================================================
export const signalementsApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Signalement>>("/signalements", { params }),

  get: (id: number) => api.get<ApiResponse<Signalement>>(`/signalements/${id}`),

  create: (data: object) =>
    api.post<ApiResponse<Signalement>>("/signalements", data),

  update: (id: number, data: object) =>
    api.put<ApiResponse<Signalement>>(`/signalements/${id}`, data),

  prendreEnCharge: (id: number) =>
    api.post<ApiResponse<Signalement>>(`/signalements/${id}/prendre-en-charge`),

  resoudre: (id: number, data: { commentaire_resolution: string }) =>
    api.post<ApiResponse<Signalement>>(`/signalements/${id}/resoudre`, data),

  creerMaintenance: (id: number, data: object) =>
    api.post(`/signalements/${id}/creer-maintenance`, data),

  uploadPhotos: (id: number, formData: FormData) =>
    api.post(`/signalements/${id}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
