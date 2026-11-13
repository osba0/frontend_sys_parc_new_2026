import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">Page introuvable</h1>
        <p className="text-gray-500 mb-8">La page que vous recherchez n'existe pas ou a été déplacée.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          ← Retour au tableau de bord
        </button>
      </div>
    </div>
  )
}
