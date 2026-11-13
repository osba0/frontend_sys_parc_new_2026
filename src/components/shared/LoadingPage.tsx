import { cn } from '@/utils'
import { AlertCircle, PackageOpen, RefreshCw } from 'lucide-react'

// ── Spinner ───────────────────────────────────────────────────
export function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <div className={cn('animate-spin rounded-full border-2 border-gray-200 border-t-primary-600', s, className)} />
  )
}

// ── Page de chargement plein écran ────────────────────────────
export default function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <span className="text-gray-500 text-sm">Chargement en cours…</span>
      </div>
    </div>
  )
}

// ── Chargement inline dans une carte ─────────────────────────
export function CardLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded-lg" />
      ))}
    </div>
  )
}

// ── État vide ─────────────────────────────────────────────────
export function EmptyState({
  title = 'Aucune donnée',
  description,
  action,
}: {
  title?:       string
  description?: string
  action?:      React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <PackageOpen size={48} className="text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  )
}

// ── État erreur ───────────────────────────────────────────────
export function ErrorState({
  message = 'Une erreur est survenue.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle size={48} className="text-red-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-700 mb-1">Erreur</h3>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary gap-2">
          <RefreshCw size={14} /> Réessayer
        </button>
      )}
    </div>
  )
}
