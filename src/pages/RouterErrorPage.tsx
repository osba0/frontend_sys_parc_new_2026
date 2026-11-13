import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { AlertTriangle, Home, RefreshCw, ArrowLeft } from 'lucide-react'

/**
 * RouterErrorPage — errorElement de React Router v6.
 * Affiché quand une route throw une erreur (loader, action, ou composant).
 *
 * Enregistré dans le router :
 *   { path: '*', errorElement: <RouterErrorPage /> }
 */
export default function RouterErrorPage() {
  const error    = useRouteError()
  const navigate = useNavigate()

  // Déterminer le type d'erreur
  let status      = 500
  let title       = 'Erreur inattendue'
  let description = 'Une erreur est survenue. Veuillez réessayer.'

  if (isRouteErrorResponse(error)) {
    status = error.status
    switch (error.status) {
      case 400:
        title       = 'Requête invalide'
        description = 'La requête envoyée au serveur est incorrecte.'
        break
      case 401:
        title       = 'Non authentifié'
        description = 'Votre session a expiré. Veuillez vous reconnecter.'
        break
      case 403:
        title       = 'Accès refusé'
        description = "Vous n'avez pas les permissions nécessaires pour accéder à cette page."
        break
      case 404:
        title       = 'Page introuvable'
        description = "La page que vous cherchez n'existe pas ou a été déplacée."
        break
      default:
        title       = `Erreur ${error.status}`
        description = error.statusText || description
    }
  } else if (error instanceof Error) {
    description = error.message
  }

  const isDev = import.meta.env.DEV

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">

        {/* Code d'erreur */}
        <div className="text-8xl font-bold text-gray-200 mb-2 leading-none">
          {status}
        </div>

        {/* Icône */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mb-4">
          <AlertTriangle size={28} className="text-red-500" />
        </div>

        {/* Titre & description */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 mb-8">{description}</p>

        {/* Détail technique (dev uniquement) */}
        {isDev && error instanceof Error && (
          <div className="mb-8 text-left bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-mono font-semibold text-red-700 mb-1">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <pre className="text-xs text-red-500 overflow-auto max-h-40 whitespace-pre-wrap mt-1">
                {error.stack.split('\n').slice(1, 6).join('\n')}
              </pre>
            )}
          </div>
        )}

        {/* Actions contextuelles selon le status */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {status === 401 ? (
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="btn-primary gap-2"
            >
              <Home size={15} /> Se connecter
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate(-1)}
                className="btn-secondary gap-2"
              >
                <ArrowLeft size={15} /> Retour
              </button>
              <button
                onClick={() => navigate('/dashboard', { replace: true })}
                className="btn-primary gap-2"
              >
                <Home size={15} /> Tableau de bord
              </button>
              {status >= 500 && (
                <button
                  onClick={() => window.location.reload()}
                  className="btn-secondary gap-2"
                >
                  <RefreshCw size={15} /> Recharger
                </button>
              )}
            </>
          )}
        </div>

        {/* Contact support */}
        <p className="mt-8 text-xs text-gray-400">
          Si le problème persiste, contactez l'administrateur système.
        </p>

      </div>
    </div>
  )
}
