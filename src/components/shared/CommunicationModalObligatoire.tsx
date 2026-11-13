import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communicationsApi } from '@/api/communications.api'
import { TypeCommunicationBadge, GraviteCommunicationBadge } from '@/components/shared/StatutBadge'
import { LoadingSpinner } from '@/components/shared/LoadingPage'
import { AlertTriangle, Paperclip, CheckCircle } from 'lucide-react'
import { formatDateTime } from '@/utils'

/**
 * Modal bloquante affichée à la connexion lorsque l'utilisateur a des
 * communications critiques avec accusé de lecture obligatoire non encore
 * confirmées. L'utilisateur doit accuser lecture de CHAQUE message avant
 * de pouvoir fermer la modal et accéder à l'application.
 */
export default function CommunicationModalObligatoire() {
  const qc = useQueryClient()
  const [indexCourant, setIndexCourant] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['communications-critiques'],
    queryFn:  () => communicationsApi.critiquesNonLues().then(r => r.data.data),
    staleTime: 5 * 60_000,
  })

  const marquerLueMut = useMutation({
    mutationFn: (id: number) => communicationsApi.marquerLue(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communications-actives'] })
    },
  })

  if (isLoading || !data || data.length === 0) return null

  const communication = data[indexCourant]
  if (!communication) return null

  const estDerniere = indexCourant >= data.length - 1

  const handleConfirmer = () => {
    marquerLueMut.mutate(communication.id, {
      onSuccess: () => {
        if (estDerniere) {
          qc.invalidateQueries({ queryKey: ['communications-critiques'] })
        } else {
          setIndexCourant(i => i + 1)
        }
      },
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Message important — Lecture obligatoire</h2>
            {data.length > 1 && (
              <p className="text-xs text-gray-500 mt-0.5">
                Message {indexCourant + 1} sur {data.length}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeCommunicationBadge type={communication.type} />
            <GraviteCommunicationBadge gravite={communication.gravite} />
          </div>

          <h3 className="text-lg font-semibold text-gray-900">{communication.titre}</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{communication.contenu}</p>

          {communication.piece_jointe_url && (
            <a
              href={communication.piece_jointe_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline"
            >
              <Paperclip size={14} /> {communication.piece_jointe_nom ?? 'Pièce jointe'}
            </a>
          )}

          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            {communication.auteur?.nom_complet} · {
              communication.date_publication
                ? formatDateTime(communication.date_publication)
                : formatDateTime(communication.created_at)
            }
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleConfirmer}
            disabled={marquerLueMut.isPending}
            className="btn-primary gap-2"
          >
            {marquerLueMut.isPending
              ? <LoadingSpinner size="sm" />
              : <CheckCircle size={16} />
            }
            J'ai lu et compris{!estDerniere && data.length > 1 ? ' — Suivant' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
