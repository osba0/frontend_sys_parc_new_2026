import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communicationsApi } from '@/api/communications.api'
import { TypeCommunicationBadge } from '@/components/shared/StatutBadge'
import { AlertTriangle, Info, AlertCircle, X, Paperclip, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDateTime } from '@/utils'

const GRAVITE_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode; iconColor: string }> = {
  critique: {
    bg: 'bg-red-50', border: 'border-red-200',
    icon: <AlertTriangle size={18} />, iconColor: 'text-red-600',
  },
  importante: {
    bg: 'bg-orange-50', border: 'border-orange-200',
    icon: <AlertCircle size={18} />, iconColor: 'text-orange-600',
  },
  info: {
    bg: 'bg-blue-50', border: 'border-blue-200',
    icon: <Info size={18} />, iconColor: 'text-blue-600',
  },
}

/**
 * Bandeau affichant les communications actives (annonces & notes de
 * service publiées, dans leur fenêtre d'affichage) visibles par
 * l'utilisateur courant. Triées par gravité (critique d'abord).
 */
export default function CommunicationBandeau() {
  const qc = useQueryClient()
  const [masquees, setMasquees] = useState<Set<number>>(new Set())
  const [depliees, setDepliees] = useState<Set<number>>(new Set())

  const { data } = useQuery({
    queryKey: ['communications-actives'],
    queryFn:  () => communicationsApi.actives().then(r => r.data.data),
    staleTime: 60_000,
  })

  const marquerLueMut = useMutation({
    mutationFn: (id: number) => communicationsApi.marquerLue(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications-critiques'] }),
  })

  const visibles = (data ?? []).filter(c => !masquees.has(c.id))

  if (visibles.length === 0) return null

  const handleFermer = (id: number, lu: boolean) => {
    setMasquees(prev => new Set(prev).add(id))
    if (!lu) marquerLueMut.mutate(id)
  }

  const toggleDeplie = (id: number) => {
    setDepliees(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {visibles.map((c) => {
        const style   = GRAVITE_STYLES[c.gravite] ?? GRAVITE_STYLES.info
        const deplie  = depliees.has(c.id)
        const longContenu = c.contenu.length > 160

        return (
          <div key={c.id} className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 mt-0.5 ${style.iconColor}`}>{style.icon}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-gray-900">{c.titre}</span>
                  <TypeCommunicationBadge type={c.type} />
                  {c.piece_jointe_url && <Paperclip size={12} className="text-gray-400" />}
                </div>

                <p className={`text-sm text-gray-700 whitespace-pre-wrap ${!deplie && longContenu ? 'line-clamp-2' : ''}`}>
                  {c.contenu}
                </p>

                {longContenu && (
                  <button
                    onClick={() => toggleDeplie(c.id)}
                    className="text-xs text-primary-600 hover:underline mt-1 flex items-center gap-0.5"
                  >
                    {deplie ? <>Réduire <ChevronUp size={12} /></> : <>Lire la suite <ChevronDown size={12} /></>}
                  </button>
                )}

                {c.piece_jointe_url && (
                  <a href={c.piece_jointe_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mt-1">
                    <Paperclip size={12} /> {c.piece_jointe_nom ?? 'Pièce jointe'}
                  </a>
                )}

                <div className="text-xs text-gray-400 mt-1.5">
                  {c.auteur?.nom_complet} · {c.date_publication ? formatDateTime(c.date_publication) : formatDateTime(c.created_at)}
                </div>
              </div>

              <button
                onClick={() => handleFermer(c.id, c.lu ?? false)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors"
                title="Marquer comme lu et masquer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
