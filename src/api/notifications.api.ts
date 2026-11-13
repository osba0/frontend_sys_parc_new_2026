import api from './axiosInstance'

export interface AppNotification {
  id:         string
  type:       string
  data: {
    event:    string
    titre:    string
    message:  string
    niveau:   'info' | 'success' | 'warning' | 'danger'
    lien:     string | null
    meta:     Record<string, any>
  }
  read_at:    string | null
  created_at: string
}

export interface NotifMeta {
  total:        number
  non_lues:     number
  current_page: number
  last_page:    number
}

export const notificationsApi = {
  list:       (params?: { filtre?: 'toutes' | 'non_lues'; page?: number }) =>
    api.get<{ data: AppNotification[]; meta: NotifMeta }>('/notifications', { params }),

  compteur:   () =>
    api.get<{ data: { non_lues: number } }>('/notifications/compteur'),

  marquerLue: (id: string) =>
    api.post(`/notifications/${id}/lire`),

  toutLire:   () =>
    api.post('/notifications/tout-lire'),

  supprimer:  (id: string) =>
    api.delete(`/notifications/${id}`),

  viderLues:  () =>
    api.delete('/notifications/lues'),
}
