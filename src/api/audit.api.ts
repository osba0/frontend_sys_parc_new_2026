import api from "./axiosInstance";

export interface AuditScope {
  type: "global" | "agence" | "personnel";
  peut_filtrer_agence: boolean;
  peut_filtrer_user: boolean;
  agence_id?: number;
  label: string;
}

export interface AuditLogEntry {
  id: number;
  log_name: string | null;
  description: string;
  event: "created" | "updated" | "deleted" | string;
  subject_type: string | null;
  subject_id: number | null;
  causer_type: string | null;
  causer_id: number | null;
  causer?: {
    id: number;
    name: string;
    prenom: string;
    email: string;
  } | null;
  properties: {
    attributes?: Record<string, any>;
    old?: Record<string, any>;
  } | null;
  agence_id: number | null;
  vehicule_id: number | null;
  chauffeur_id: number | null;
  module: string | null;
  created_at: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
  scope: AuditScope;
}

export interface AuditModule {
  value: string;
  label: string;
}

export const auditApi = {
  list: (params?: object) =>
    api.get<AuditLogResponse>("/audit-logs", { params }),

  modules: () => api.get<{ data: AuditModule[] }>("/audit-logs/modules"),

  utilisateurs: () =>
    api.get<{ data: { id: number; label: string }[] }>(
      "/audit-logs/utilisateurs",
    ),
};
