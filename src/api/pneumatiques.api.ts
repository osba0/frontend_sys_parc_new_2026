import api from './axiosInstance'
import type { Pneumatique, PneumatiqueStats, PaginatedResponse, ApiResponse } from '@/types'

export const pneumatiquesApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Pneumatique>>('/pneumatiques', { params }),

  stats: (params?: { annee?: number; agence_id?: number }) =>
    api.get<ApiResponse<PneumatiqueStats>>('/pneumatiques/stats', { params }),

  get: (id: number) =>
    api.get<ApiResponse<Pneumatique>>(`/pneumatiques/${id}`),

  create: (data: object) =>
    api.post<ApiResponse<Pneumatique>>('/pneumatiques', data),

  update: (id: number, data: object) =>
    api.put<ApiResponse<Pneumatique>>(`/pneumatiques/${id}`, data),

  delete: (id: number) =>
    api.delete(`/pneumatiques/${id}`),
}
