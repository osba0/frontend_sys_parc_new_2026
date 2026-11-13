import api from './axiosInstance'
import type { Communication, ApiResponse, PaginatedResponse } from '@/types'

export const communicationsApi = {
  // ── Gestion (CRUD) ──────────────────────────────────────────
  list: (params?: object) =>
    api.get<PaginatedResponse<Communication>>('/communications', { params }),

  get: (id: number) =>
    api.get<ApiResponse<Communication>>(`/communications/${id}`),

  create: (data: FormData | object) => {
    const isFormData = data instanceof FormData
    return api.post<ApiResponse<Communication>>('/communications', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
  },

  update: (id: number, data: FormData | object) => {
    const isFormData = data instanceof FormData
    if (isFormData) {
      // Laravel : spoofing PUT pour multipart
      ;(data as FormData).append('_method', 'PUT')
      return api.post<ApiResponse<Communication>>(`/communications/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.put<ApiResponse<Communication>>(`/communications/${id}`, data)
  },

  delete: (id: number) =>
    api.delete(`/communications/${id}`),

  publier: (id: number) =>
    api.post<ApiResponse<Communication>>(`/communications/${id}/publier`),

  archiver: (id: number) =>
    api.post<ApiResponse<Communication>>(`/communications/${id}/archiver`),

  // ── Consultation ────────────────────────────────────────────
  actives: () =>
    api.get<ApiResponse<Communication[]>>('/communications/actives'),

  critiquesNonLues: () =>
    api.get<ApiResponse<Communication[]>>('/communications/critiques-non-lues'),

  historique: (params?: object) =>
    api.get<PaginatedResponse<Communication>>('/communications/historique', { params }),

  marquerLue: (id: number) =>
    api.post(`/communications/${id}/lire`),
}
