import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { pneumatiquesApi } from '@/api/pneumatiques.api'
import { useAgences } from '@/hooks'
import PageHeader from '@/components/shared/PageHeader'
import { CardLoading } from '@/components/shared/LoadingPage'
import { TypeOperationPneuBadge } from '@/components/shared/StatutBadge'
import { formatCfa, getMoisLabel } from '@/utils'
import { ArrowLeft } from 'lucide-react'

const COULEURS_TYPE: Record<string, string> = {
  achat_neuf: '#22C55E',
  rechape:    '#3B82F6',
  rotation:   '#9CA3AF',
  reparation: '#F59E0B',
  reforme:    '#EF4444',
}

const LABELS_TYPE: Record<string, string> = {
  achat_neuf: 'Achat neuf',
  rechape:    'Rechapé',
  rotation:   'Rotation',
  reparation: 'Réparation',
  reforme:    'Réforme',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color ?? p.fill }} />
          <span className="text-gray-600">{p.name} :</span>
          <span className="font-medium">{formatCfa(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function PneumatiqueStatsPage() {
  const navigate = useNavigate()
  const [annee,    setAnnee]    = useState(new Date().getFullYear())
  const [agenceId, setAgenceId] = useState('')

  const { data: agences = [] } = useAgences()
  const annees = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['pneumatiques-stats', annee, agenceId],
    queryFn:  () => pneumatiquesApi.stats({ annee, agence_id: agenceId ? parseInt(agenceId) : undefined })
      .then(r => r.data.data),
  })

  const seriesMois = (stats?.par_mois ?? []).map((m) => ({
    mois:  getMoisLabel(m.mois).slice(0, 3),
    Total: m.total,
    nb:    m.nb,
  }))

  const seriesType = (stats?.par_type ?? []).map((t) => ({
    name:  LABELS_TYPE[t.type] ?? t.type,
    value: t.total,
    type:  t.type,
    nb:    t.nb,
    qte:   t.qte,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques pneumatiques"
        subtitle={`Année ${annee}`}
        actions={
          <button onClick={() => navigate('/pneumatiques')} className="btn-secondary gap-2">
            <ArrowLeft size={16} /> Retour
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <select value={annee} onChange={e => setAnnee(parseInt(e.target.value))} className="input h-9 py-0 text-sm w-28">
          {annees.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={agenceId} onChange={e => setAgenceId(e.target.value)} className="input h-9 py-0 text-sm w-44">
          <option value="">Toutes agences</option>
          {agences.map((a: any) => (
            <option key={a.id} value={a.id}>{a.nom}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="card p-6"><CardLoading rows={6} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Dépense totale</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCfa(stats?.total_global ?? 0)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Opérations</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(stats?.par_type ?? []).reduce((s, t) => s + t.nb, 0)}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Pneus achetés (neuf)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(stats?.par_type ?? []).find(t => t.type === 'achat_neuf')?.qte ?? 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="section-title mb-3">Dépenses mensuelles</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={seriesMois}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Total" name="Montant" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-3">Répartition par type d'opération</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={seriesType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {seriesType.map((entry) => (
                      <Cell key={entry.type} fill={COULEURS_TYPE[entry.type] ?? '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCfa(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="section-title mb-3">Top 10 véhicules — dépenses pneumatiques</h3>
            {(stats?.par_vehicule ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucune donnée pour cette période.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                      <th className="py-2 pr-4">Véhicule</th>
                      <th className="py-2 pr-4">Modèle</th>
                      <th className="py-2 pr-4 text-right">Opérations</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.par_vehicule ?? []).map((v) => (
                      <tr key={v.vehicule_id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/vehicules/${v.vehicule_id}`)}>
                        <td className="py-2 pr-4 font-mono font-semibold text-primary-700">{v.immatriculation}</td>
                        <td className="py-2 pr-4 text-gray-600">{v.marque_modele}</td>
                        <td className="py-2 pr-4 text-right text-gray-500">{v.nb}</td>
                        <td className="py-2 text-right font-semibold">{formatCfa(v.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="section-title mb-3">Détail par type d'opération</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(stats?.par_type ?? []).map((t) => (
                <div key={t.type} className="p-3 bg-gray-50 rounded-xl">
                  <TypeOperationPneuBadge type={t.type} className="mb-2" />
                  <p className="text-lg font-bold text-gray-900">{formatCfa(t.total)}</p>
                  <p className="text-xs text-gray-400">{t.nb} opération(s) · {t.qte} pneu(s)</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
