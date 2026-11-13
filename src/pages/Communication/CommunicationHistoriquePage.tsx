import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { communicationsApi } from '@/api/communications.api'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import {
  GraviteCommunicationBadge, TypeCommunicationBadge,
} from '@/components/shared/StatutBadge'
import { formatDateTime } from '@/utils'
import { Paperclip, Eye } from 'lucide-react'
import type { Communication } from '@/types'

export default function CommunicationHistoriquePage() {
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<Communication | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['communications-historique', page],
    queryFn:  () => communicationsApi.historique({ page, per_page: 20 }).then(r => r.data),
  })

  const columns: Column<Communication>[] = [
    {
      key:    'titre',
      header: 'Titre',
      render: (c) => (
        <div>
          <div className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
            {c.titre}
            {c.piece_jointe_url && <Paperclip size={12} className="text-gray-400" />}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {c.auteur?.nom_complet}
          </div>
        </div>
      ),
    },
    {
      key:    'type',
      header: 'Type',
      render: (c) => <TypeCommunicationBadge type={c.type} />,
    },
    {
      key:    'gravite',
      header: 'Gravité',
      render: (c) => <GraviteCommunicationBadge gravite={c.gravite} />,
    },
    {
      key:    'date_publication',
      header: 'Période',
      render: (c) => (
        <div className="text-xs text-gray-500">
          {c.date_publication ? formatDateTime(c.date_publication) : '—'}
          {c.date_expiration && <> → {formatDateTime(c.date_expiration)}</>}
        </div>
      ),
    },
    {
      key:    'actions',
      header: '',
      render: (c) => (
        <button onClick={() => setDetail(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <Eye size={14} />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historique"
        subtitle={`${data?.meta?.total ?? 0} message(s) archivé(s)`}
      />

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        total={data?.meta?.total}
        page={page}
        perPage={20}
        onPageChange={setPage}
        loading={isLoading}
        error={error ? 'Erreur de chargement.' : null}
        onRetry={refetch}
        rowKey={(c) => c.id}
        onRowClick={(c) => setDetail(c)}
        emptyTitle="Aucun message archivé"
        emptyDescription="Les annonces et notes de service archivées apparaîtront ici."
      />

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetail(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <TypeCommunicationBadge type={detail.type} />
                <GraviteCommunicationBadge gravite={detail.gravite} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{detail.titre}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{detail.contenu}</p>
              {detail.piece_jointe_url && (
                <a href={detail.piece_jointe_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline">
                  <Paperclip size={14} /> {detail.piece_jointe_nom ?? 'Pièce jointe'}
                </a>
              )}
              <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                Par {detail.auteur?.nom_complet} · {formatDateTime(detail.created_at)}
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setDetail(null)} className="btn-secondary">Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
