import api from './axiosInstance'

export interface RoleSummary {
  id:                 number
  name:               string
  label:              string
  permissions_count:  number
  users_count:        number
  protege:            boolean
}

export interface PermissionItem {
  id:       number
  name:     string
  module:   string
  action:   string
  attribue: boolean
}

export interface ModuleGroup {
  module:      string
  label:       string
  permissions: PermissionItem[]
}

export interface RoleDetail {
  role: {
    id:      number
    name:    string
    label:   string
    protege: boolean
  }
  modules:            ModuleGroup[]
  total_attribuees:   number
  total_disponibles:  number
}

export const rolesApi = {
  list: () =>
    api.get<{ data: RoleSummary[] }>('/admin/roles'),

  show: (roleId: number) =>
    api.get<{ data: RoleDetail }>(`/admin/roles/${roleId}/permissions`),

  sync: (roleId: number, permissions: string[]) =>
    api.put(`/admin/roles/${roleId}/permissions`, { permissions }),

  attribuer: (roleId: number, permissions: string[]) =>
    api.post(`/admin/roles/${roleId}/permissions/attribuer`, { permissions }),

  retirer: (roleId: number, permissions: string[]) =>
    api.post(`/admin/roles/${roleId}/permissions/retirer`, { permissions }),
}
