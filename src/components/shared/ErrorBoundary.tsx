import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children:     ReactNode
  fallback?:    ReactNode
  onError?:     (error: Error, info: ErrorInfo) => void
}

interface State {
  hasError:    boolean
  error:       Error | null
  errorInfo:   ErrorInfo | null
}

/**
 * ErrorBoundary — capture toutes les erreurs React non gérées.
 *
 * Usage :
 *   <ErrorBoundary>
 *     <MonComposant />
 *   </ErrorBoundary>
 *
 *   // Avec fallback personnalisé :
 *   <ErrorBoundary fallback={<p>Erreur dans ce bloc</p>}>
 *     ...
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)

    // En production, envoyer à un service de monitoring (Sentry, etc.)
    if (import.meta.env.PROD) {
      console.error('[ErrorBoundary]', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback
    }

    return (
      <ErrorFallback
        error={this.state.error}
        onReset={this.handleReset}
      />
    )
  }
}

// ── Fallback UI par défaut ────────────────────────────────────
interface ErrorFallbackProps {
  error:   Error | null
  onReset: () => void
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const isDev = import.meta.env.DEV

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">

        {/* Icône */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-6">
          <AlertTriangle size={32} className="text-red-500" />
        </div>

        {/* Message principal */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Ce composant a rencontré une erreur inattendue.
          Vous pouvez réessayer ou retourner à l'accueil.
        </p>

        {/* Détails technique (dev uniquement) */}
        {isDev && error && (
          <div className="mb-6 text-left bg-red-50 border border-red-100 rounded-lg p-4">
            <p className="text-xs font-mono font-semibold text-red-700 mb-1">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <pre className="text-xs text-red-600 overflow-auto max-h-32 whitespace-pre-wrap">
                {error.stack.split('\n').slice(1, 5).join('\n')}
              </pre>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onReset}
            className="btn-primary gap-2"
          >
            <RefreshCw size={15} /> Réessayer
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="btn-secondary gap-2"
          >
            <Home size={15} /> Tableau de bord
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Composant fonctionnel léger pour les erreurs inline ───────
export function InlineError({
  message = 'Une erreur est survenue dans ce bloc.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4 flex items-start gap-3">
      <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-red-700">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs text-red-600 hover:underline font-medium"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  )
}
