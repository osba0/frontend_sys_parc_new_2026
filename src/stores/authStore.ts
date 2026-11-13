import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Role } from '@/types'

interface AuthStore {
  token:     string | null
  user:      User | null
  role:      Role | null
  agence_id: number | null

  // Actions
  setAuth:   (token: string, user: User) => void
  setUser:   (user: User) => void
  clearAuth: () => void

  // Helpers permissions
  hasRole:    (...roles: Role[]) => boolean
  hasPermission: (permission: string) => boolean
  isGlobal:   () => boolean // super_admin, directeur, resp_parc, comptable
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token:     null,
      user:      null,
      role:      null,
      agence_id: null,

      setAuth: (token, user) => set({
        token,
        user,
        role:      user.role as Role ?? null,
        agence_id: user.agence_id,
      }),

      setUser: (user) => set({
        user,
        role:      user.role as Role ?? null,
        agence_id: user.agence_id,
      }),

      clearAuth: () => set({
        token:     null,
        user:      null,
        role:      null,
        agence_id: null,
      }),

      hasRole: (...roles) => {
        const currentRole = get().role
        if (!currentRole) return false
        return roles.includes(currentRole)
      },

      hasPermission: (permission) => {
        const user = get().user
        if (!user) return false
        // super_admin a tout
        if (user.role === 'super_admin') return true
        return user.permissions?.includes(permission) ?? false
      },

      isGlobal: () => {
        return get().hasRole('super_admin', 'directeur', 'resp_parc', 'comptable')
      },
    }),
    {
      name:    'parc-auto-auth',
      // Ne persister que le token et les infos légères
      partialize: (state) => ({
        token:     state.token,
        user:      state.user,
        role:      state.role,
        agence_id: state.agence_id,
      }),
    }
  )
)
