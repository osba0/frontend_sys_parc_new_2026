import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signalementsApi } from '@/api/operations.api'
import { useFournisseurs } from '@/hooks'
import { LoadingSpinner } from '@/components/shared/LoadingPage'
import { formatCfa } from '@/utils'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface Props {
  signalement: {
    id:                number
    titre:             string
    vehicule_id:       number
    description:       string
    date_signalement?: string
  }
  onClose:   () => void
  onSuccess?: (maintenanceId: number) => void
}

// ─────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────

export default function CreerMaintenanceModal({ signalement, onClose, onSuccess }: Props) {
  const qc       = useQueryClient()
  const navigate = useNavigate()

  const [fournisseurId,     setFournisseurId]     = useState('')
  const [dateTravaux,       setDateTravaux]       = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [descriptionTravaux, setDescriptionTravaux] = useState(
    `Réparation suite signalement : ${signalement.titre}`
  )
  const [montantTtc, setMontantTtc] = useState('')
  const [naviguerVers, setNaviguerVers] = useState<'maintenance' | 'signalement' | 'rester'>('maintenance')

  const { data: fournisseurs = [] } = useFournisseurs({ per_page: 100 })

  const mutation = useMutation({
    mutationFn: () => signalementsApi.creerMaintenance(signalement.id, {
      fournisseur_id:      fournisseurId ? parseInt(fournisseurId) : null,
      date_travaux:        dateTravaux,
      description_travaux: descriptionTravaux.trim(),
      montant_ttc:         montantTtc ? parseFloat(montantTtc) : 0,
    }),
    onSuccess: (res: any) => {
      const maintenanceId = res?.data?.data?.maintenance?.id ?? res?.data?.data?.id

      // Invalider les caches concernés
      qc.invalidateQueries({ queryKey: ['signalement',  signalement.id] })
      qc.invalidateQueries({ queryKey: ['signalements'] })
      qc.invalidateQueries({ queryKey: ['maintenances'] })
      qc.invalidateQueries({ queryKey: ['vehicule',     signalement.vehicule_id] })

      toast.success('Maintenance créée et liée au signalement.')

      onSuccess?.(maintenanceId)
      onClose()

      // Navigation après création
      if (naviguerVers === 'maintenance' && maintenanceId) {
        navigate(`/maintenances/${maintenanceId}`)
      } else if (naviguerVers === 'signalement') {
        navigate(`/signalements/${signalement.id}`)
      }
      // 'rester' → pas de navigation
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erreur lors de la création.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!descriptionTravaux.trim()) {
      toast.error('Description des travaux obligatoire.')
      return
    }
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-yellow-600 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Wrench size={18} /> Créer une maintenance
            </h3>
            <p className="text-yellow-100 text-xs mt-0.5 truncate max-w-xs">
              Signalement : {signalement.titre}
            </p>
          </div>
          <button onClick={onClose} className="text-yellow-100 hover:text-white text-2xl leading-none">
            ✕
          </button>
        </div>

        <form id="maint-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* Info signalement source */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <p className="font-medium mb-0.5">Liée au signalement #{signalement.id}</p>
            <p className="text-xs text-yellow-600">
              La maintenance sera automatiquement liée et le statut du signalement
              passera à <strong>maintenance_créée</strong>.
            </p>
          </div>

          {/* Fournisseur */}
          <div>
            <label className="label">
              Fournisseur / Garage
              <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
            </label>
            <select
              value={fournisseurId}
              onChange={e => setFournisseurId(e.target.value)}
              className="input"
            >
              <option value="">— Sélectionner un fournisseur —</option>
              {fournisseurs.map((f: any) => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </div>

          {/* Date des travaux */}
          <div>
            <label className="label">Date des travaux *</label>
            <input
              type="date"
              value={dateTravaux}
              onChange={e => setDateTravaux(e.target.value)}
              className="input"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description des travaux *</label>
            <textarea
              value={descriptionTravaux}
              onChange={e => setDescriptionTravaux(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Décrivez les travaux à effectuer…"
              required
            />
          </div>

          {/* Montant TTC */}
          <div>
            <label className="label">
              Montant TTC estimé (FCFA)
              <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
            </label>
            <input
              type="number"
              value={montantTtc}
              onChange={e => setMontantTtc(e.target.value)}
              className="input"
              min={0}
              step={1000}
              placeholder="0"
            />
            {montantTtc && Number(montantTtc) > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {formatCfa(Number(montantTtc))}
                {Number(montantTtc) >= 500000 && (
                  <span className="ml-2 text-yellow-600 font-medium">
                    ⚠ Approbation requise (montant élevé)
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Navigation après création */}
          <div>
            <label className="label">Après la création, aller vers</label>
            <div className="flex gap-2">
              {[
                { value: 'maintenance',  label: '🔧 Fiche maintenance' },
                { value: 'signalement',  label: '🔔 Fiche signalement' },
                { value: 'rester',       label: '📍 Rester ici' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNaviguerVers(opt.value as typeof naviguerVers)}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border-2 transition-all ${
                    naviguerVers === opt.value
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            type="submit"
            form="maint-form"
            disabled={mutation.isPending}
            className="btn bg-yellow-600 text-white hover:bg-yellow-700 gap-2"
          >
            {mutation.isPending
              ? <><LoadingSpinner size="sm" /> Création…</>
              : <><Wrench size={15} /> Créer la maintenance</>
            }
          </button>
        </div>

      </div>
    </div>
  )
}
