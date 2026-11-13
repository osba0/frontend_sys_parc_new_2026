import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { Role } from '@/types'

interface Props {
  children: React.ReactNode
  roles?:   Role[]  // Si défini, vérifie que l'utilisateur a l'un de ces rôles
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { token, hasRole } = useAuthStore()
  const location = useLocation()

  // 1. Pas authentifié → login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 2. Rôle insuffisant → page 403
  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl font-bold text-gray-300 mb-4">403</div>
          <h1 className="text-2xl font-semibold text-gray-700 mb-2">Accès refusé</h1>
          <p className="text-gray-500 mb-6">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          <button
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            ← Retour
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
