import api from "./axiosInstance";
import type { User } from "@/types";

// ============================================================
// Auth
// ============================================================
export const authApi = {
  login: (login: string, password: string) =>
    api.post<{ data: { token: string; user: User } }>("/auth/login", {
      login,
      password,
    }),

  logout: () => api.post("/auth/logout"),

  me: () => api.get<{ data: User }>("/auth/me"),

  changePassword: (data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => api.post("/auth/password/change", data),

  updateProfile: (data: {
    name?: string;
    prenom?: string;
    telephone?: string;
    fonction?: string;
  }) => api.put("/auth/profile", data),
};
