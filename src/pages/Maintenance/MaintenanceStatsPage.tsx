import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useMaintenanceStats, useAgences } from '@/hooks'
import PageHeader from '@/components/shared/PageHeader'
import { CardLoading } from '@/components/shared/LoadingPage'
import { formatCfa, getMoisLabel, getTypeOperationLabel } from '@/utils'

// ── Couleurs par type d'opération ────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  entretien:        '#2E86C1',
  reparation:       '#E74C3C',
  pneu:             '#7F8C8D',
  carrosserie:      '#F39C12',
  equipement:       '#9B59B6',
  visite_technique: '#1ABC9C',
  contravention:    '#E67E22',
}

// ── Tooltip personnalisé ──────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name} :</span>
          <span className="font-medium">{formatCfa(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page statistiques
// ─────────────────────────────────────────────────────────────

export default function MaintenanceStatsPage() {
  const navigate = useNavigate()
  const [annee,    setAnnee]    = useState(new Date().getFullYear())
  const [agenceId, setAgenceId] = useState('')

  const { data: agences = [] } = useAgences()
  const { data: stats, isLoading } = useMaintenanceStats({ annee, agence_id: agenceId || undefined })

  // ── Données graphique mensuel ─────────────────────────────
  const seriesMois = (stats?.par_mois ?? []).map((m: any) => ({
    mois:  getMoisLabel(m.mois).slice(0, 3),
    Total: Number(m.total) || 0,
    Nb:    Number(m.nb)    || 0,
  }))

  // ── Données camembert par type ────────────────────────────
  // par_type est un objet { entretien: {total, nb}, reparation: ... }
  const seriesType = Object.entries(stats?.par_type ?? {})
    .map(([key, val]: [string, any]) => ({
      name:  getTypeOperationLabel(key),
      key,
      value: Number(val?.total) || 0,
      nb:    Number(val?.nb)    || 0,
      color: TYPE_COLORS[key] ?? '#BDC3C7',
    }))
    .filter(t => t.value > 0)
    .sort((a, b) => b.value - a.value)

  const totalGlobal = seriesType.reduce((s, t) => s + t.value, 0)

  // ── Années disponibles ────────────────────────────────────
  const annees = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques Maintenance"
        subtitle={`Analyse des interventions ${annee}`}
        backTo="/maintenances"
        actions={
          <div className="flex gap-2">
            <select
              value={agenceId}
              onChange={e => setAgenceId(e.target.value)}
              className="input h-8 py-0 text-sm w-40"
            >
              <option value="">Toutes agences</option>
              {agences.map((a: any) => (
                <option key={a.id} value={a.id}>{a.nom}</option>
              ))}
            </select>
            <select
              value={annee}
              onChange={e => setAnnee(parseInt(e.target.value))}
              className="input h-8 py-0 text-sm w-24"
            >
              {annees.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4"><CardLoading rows={2} /></div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total dépensé',
                value: formatCfa(stats?.total_annee ?? 0),
                sub:   `${annee}`,
                color: 'text-primary-700',
              },
              {
                label: 'Interventions',
                value: stats?.nb_interventions ?? 0,
                sub:   'maintenances terminées',
                color: 'text-gray-900',
              },
              {
                label: 'Coût moyen',
                value: formatCfa(stats?.cout_moyen ?? 0),
                sub:   'par intervention',
                color: 'text-gray-900',
              },
              {
                label: 'Véhicules traités',
                value: stats?.nb_vehicules ?? 0,
                sub:   'véhicules distincts',
                color: 'text-gray-900',
              },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="card p-5 text-center">
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</dt>
                <dd className={`text-2xl font-bold ${color}`}>{value}</dd>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* ── Graphiques ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Dépenses mensuelles */}
            <div className="xl:col-span-2 card p-6">
              <h3 className="section-title">Dépenses mensuelles {annee}</h3>
              {seriesMois.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={seriesMois} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
                      tick={{ fontSize: 10 }}
                      width={55}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="Total"
                      fill="#2E86C1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">
                  Aucune donnée pour {annee}
                </div>
              )}
            </div>

            {/* Répartition par type */}
            <div className="card p-6">
              <h3 className="section-title">Par type d'opération</h3>
              {seriesType.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={seriesType}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {seriesType.map((t, i) => (
                          <Cell key={i} fill={t.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [formatCfa(v), '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-3">
                    {seriesType.map(t => (
                      <div key={t.key} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ background: t.color }}
                          />
                          <span className="text-gray-600 truncate">{t.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-gray-400">{t.nb}x</span>
                          <span className="font-medium text-gray-700">{formatCfa(t.value)}</span>
                          <span className="text-gray-400 w-8 text-right">
                            {Math.round((t.value / (totalGlobal || 1)) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                  Aucune donnée
                </div>
              )}
            </div>
          </div>

          {/* ── Top véhicules ── */}
          {(stats?.top_vehicules?.length ?? 0) > 0 && (
            <div className="card p-6">
              <h3 className="section-title">Top 10 véhicules — coût maintenance {annee}</h3>
              <div className="space-y-2">
                {stats!.top_vehicules.map((v: any, i: number) => {
                  const pct = Math.round((v.total / (stats!.top_vehicules[0].total || 1)) * 100)
                  return (
                    <div
                      key={v.vehicule_id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/vehicules/${v.vehicule_id}`)}
                    >
                      {/* Rang */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-100 text-gray-600'    :
                        i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'
                      }`}>
                        {i + 1}
                      </div>
                      {/* Immatriculation */}
                      <span className="font-mono font-semibold text-primary-700 w-28 flex-shrink-0 text-sm">
                        {v.immatriculation}
                      </span>
                      {/* Barre de progression */}
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {/* Montant */}
                      <span className="font-semibold text-sm text-gray-800 w-28 text-right flex-shrink-0">
                        {formatCfa(v.total)}
                      </span>
                      {/* Nb interventions */}
                      <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0">
                        {v.nb} interv.
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Top fournisseurs ── */}
          {(stats?.top_fournisseurs?.length ?? 0) > 0 && (
            <div className="card p-6">
              <h3 className="section-title">Top fournisseurs / garages {annee}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {stats!.top_fournisseurs.map((f: any, i: number) => (
                  <div key={f.fournisseur_id ?? i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">
                        #{i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {f.nom ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-400">{f.nb} interv.</span>
                      <span className="font-semibold text-sm text-primary-700">
                        {formatCfa(f.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
