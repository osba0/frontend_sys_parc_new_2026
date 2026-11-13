import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BarChart3, CircleDot } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { pneumatiquesApi } from '@/api/pneumatiques.api'
import { useAgences } from '@/hooks'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import { TypeOperationPneuBadge } from '@/components/shared/StatutBadge'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatCfa, formatKm } from '@/utils'
import type { Pneumatique } from '@/types'

export default function PneumatiqueListPage() {
  const navigate    = useNavigate()
  const { hasRole } = useAuthStore()
  const peutCreer   = hasRole('super_admin', 'directeur', 'resp_parc', 'resp_agence')

  const [page,     setPage]     = useState(1)
  const [annee,    setAnnee]    = useState(new Date().getFullYear())
  const [agenceId, setAgenceId] = useState('')
  const [type,     setType]     = useState('')
  const [vehicule, setVehicule] = useState('')

  const { data: agences = [] } = useAgences()
  const annees = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pneumatiques', { page, annee, agenceId, type, vehicule }],
    queryFn:  () => pneumatiquesApi.list({
      page,
      per_page:                  25,
      sort:                      '-date',
      include:                   'vehicule,fournisseur',
      'filter[annee]':           annee     || undefined,
      'filter[agence_id]':       agenceId  || undefined,
      'filter[type_operation]':  type      || undefined,
      'filter[immatriculation]': vehicule  || undefined,
    }).then(r => r.data),
  })

  const columns: Column<Pneumatique>[] = [
    {
      key:    'date',
      header: 'Date',
      render: (p) => <span className="text-sm">{formatDate(p.date)}</span>,
    },
    {
      key:    'vehicule',
      header: 'Véhicule',
      render: (p) => (
        <span className="font-mono text-primary-700 font-semibold text-sm">
          {p.vehicule?.immatriculation ?? '—'}
        </span>
      ),
    },
    {
      key:    'type_operation',
      header: 'Opération',
      render: (p) => <TypeOperationPneuBadge type={p.type_operation} />,
    },
    {
      key:    'position',
      header: 'Position',
      render: (p) => <span className="text-sm capitalize">{p.position?.replace(/_/g, ' ') ?? '—'}</span>,
    },
    {
      key:    'marque_pneu',
      header: 'Marque / Dimension',
      render: (p) => (
        <div>
          <div className="text-sm font-medium">{p.marque_pneu ?? '—'}</div>
          {p.dimension && <div className="text-xs text-gray-500">{p.dimension}</div>}
        </div>
      ),
    },
    {
      key:    'quantite',
      header: 'Qté',
      render: (p) => <span className="font-mono text-sm">{p.quantite}</span>,
    },
    {
      key:    'montant_total',
      header: 'Montant',
      render: (p) => <span className="font-semibold text-sm">{formatCfa(p.montant_total)}</span>,
    },
    {
      key:    'kilometrage',
      header: 'Km',
      render: (p) => (
        <span className="font-mono text-xs text-gray-500">
          {p.kilometrage ? formatKm(p.kilometrage) : '—'}
        </span>
      ),
    },
    {
      key:    'fournisseur',
      header: 'Fournisseur',
      render: (p) => <span className="text-sm">{p.fournisseur?.nom ?? '—'}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pneumatiques"
        subtitle={`${data?.meta?.total ?? 0} opération(s)`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/pneumatiques/stats')}
              className="btn-secondary gap-2"
            >
              <BarChart3 size={16} /> Stats
            </button>
            {peutCreer && (
              <button
                onClick={() => navigate('/pneumatiques/nouveau')}
                className="btn-primary gap-2"
              >
                <Plus size={16} /> Nouvelle opération
              </button>
            )}
          </div>
        }
      />

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        total={data?.meta?.total}
        page={page}
        perPage={25}
        onPageChange={setPage}
        loading={isLoading}
        error={error ? 'Erreur de chargement.' : null}
        onRetry={refetch}
        rowKey={(p) => p.id}
        onRowClick={(p) => navigate(`/pneumatiques/${p.id}`)}
        emptyTitle="Aucune opération"
        emptyDescription="Aucune opération pneumatique enregistrée pour ces critères."
        searchable
        searchPlaceholder="Immatriculation…"
        onSearch={(q) => { setVehicule(q); setPage(1) }}
        filters={
          <div className="flex flex-wrap gap-2">
            <select
              value={annee}
              onChange={e => { setAnnee(parseInt(e.target.value)); setPage(1) }}
              className="input h-8 py-0 text-sm w-24"
            >
              {annees.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={type}
              onChange={e => { setType(e.target.value); setPage(1) }}
              className="input h-8 py-0 text-sm w-36"
            >
              <option value="">Toutes opérations</option>
              <option value="achat_neuf">Achat neuf</option>
              <option value="rechape">Rechapé</option>
              <option value="rotation">Rotation</option>
              <option value="reparation">Réparation</option>
              <option value="reforme">Réforme</option>
            </select>
            <select
              value={agenceId}
              onChange={e => { setAgenceId(e.target.value); setPage(1) }}
              className="input h-8 py-0 text-sm w-40"
            >
              <option value="">Toutes agences</option>
              {agences.map((a: any) => (
                <option key={a.id} value={a.id}>{a.nom}</option>
              ))}
            </select>
          </div>
        }
      />
    </div>
  )
}
