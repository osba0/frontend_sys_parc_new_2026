import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pneumatiquesApi } from '@/api/pneumatiques.api'
import PageHeader from '@/components/shared/PageHeader'
import { CardLoading } from '@/components/shared/LoadingPage'
import { TypeOperationPneuBadge } from '@/components/shared/StatutBadge'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatCfa, formatKm } from '@/utils'
import { Edit, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const POSITION_LABELS: Record<string, string> = {
  avant_gauche:   'Avant gauche',
  avant_droit:    'Avant droit',
  arriere_gauche: 'Arrière gauche',
  arriere_droit:  'Arrière droit',
  secours:        'Roue de secours',
  train_complet:  'Train complet (4 roues)',
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}

export default function PneumatiqueDetailPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const qc       = useQueryClient()
  const { hasRole } = useAuthStore()
  const peutGerer = hasRole('super_admin', 'directeur', 'resp_parc', 'resp_agence')

  const { data: pneu, isLoading } = useQuery({
    queryKey: ['pneumatique', id],
    queryFn:  () => pneumatiquesApi.get(parseInt(id!)).then(r => r.data.data),
  })

  const deleteMut = useMutation({
    mutationFn: () => pneumatiquesApi.delete(parseInt(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pneumatiques'] })
      toast.success('Opération supprimée.')
      navigate('/pneumatiques')
    },
    onError: () => toast.error('Erreur lors de la suppression.'),
  })

  const handleDelete = () => {
    if (confirm('Supprimer définitivement cette opération pneumatique ?')) {
      deleteMut.mutate()
    }
  }

  if (isLoading || !pneu) {
    return <div className="card p-6"><CardLoading rows={8} /></div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={`Opération pneumatique #${pneu.id}`}
        subtitle={formatDate(pneu.date)}
        backTo="/pneumatiques"
        actions={
          peutGerer ? (
            <div className="flex gap-2">
              <button onClick={() => navigate(`/pneumatiques/${pneu.id}/modifier`)} className="btn-secondary gap-2">
                <Edit size={16} /> Modifier
              </button>
              <button onClick={handleDelete} className="btn-danger gap-2" disabled={deleteMut.isPending}>
                <Trash2 size={16} /> Supprimer
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <TypeOperationPneuBadge type={pneu.type_operation} />
          <span className="text-2xl font-bold text-gray-900">{formatCfa(pneu.montant_total)}</span>
        </div>

        <Row label="Véhicule" value={
          <button onClick={() => navigate(`/vehicules/${pneu.vehicule_id}`)} className="font-mono font-semibold text-primary-700 hover:underline">
            {pneu.vehicule?.immatriculation ?? '—'}
          </button>
        } />
        {pneu.vehicule && (
          <Row label="Modèle" value={`${pneu.vehicule.marque} ${pneu.vehicule.modele}`} />
        )}
        <Row label="Date" value={formatDate(pneu.date)} />
        <Row label="Position" value={pneu.position ? (POSITION_LABELS[pneu.position] ?? pneu.position) : '—'} />
        <Row label="Marque du pneu" value={pneu.marque_pneu ?? '—'} />
        <Row label="Dimension" value={pneu.dimension ?? '—'} />
        <Row label="Quantité" value={pneu.quantite} />
        <Row label="Prix unitaire" value={pneu.prix_unitaire ? formatCfa(pneu.prix_unitaire) : '—'} />
        <Row label="Montant total" value={<strong>{formatCfa(pneu.montant_total)}</strong>} />
        <Row label="Kilométrage" value={pneu.kilometrage ? formatKm(pneu.kilometrage) : '—'} />
        <Row label="Fournisseur" value={pneu.fournisseur?.nom ?? '—'} />
        <Row label="Chauffeur" value={pneu.chauffeur?.nom_complet ?? '—'} />

        {pneu.commentaire && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <p className="text-xs text-gray-400 mb-1">Commentaire</p>
            <p className="text-sm text-gray-700">{pneu.commentaire}</p>
          </div>
        )}
      </div>
    </div>
  )
}
