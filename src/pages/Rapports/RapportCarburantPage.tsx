import { useState } from 'react'
import { Download } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { rapportsApi } from '@/api/finance.api'
import PageHeader from '@/components/shared/PageHeader'
import { CardLoading } from '@/components/shared/LoadingPage'
import { formatCfa, getMoisLabel, downloadBlob } from '@/utils'
import { useAgences } from '@/hooks'
import toast from 'react-hot-toast'

export default function RapportCarburantPage() {
  const annees = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const [annee,    setAnnee]    = useState(new Date().getFullYear())
  const [agenceId, setAgenceId] = useState('')
  const { data: agences = [] }  = useAgences()

  const { data: rapport, isLoading } = useQuery({
    queryKey: ['rapport-carburant', annee, agenceId],
    queryFn: () => rapportsApi.carburant({
      annee, agence_id: agenceId || undefined,
    }).then(r => r.data.data),
  })

  const handleExcel = async () => {
    try {
      const res = await rapportsApi.excelCarburant({ annee, agence_id: agenceId || undefined })
      downloadBlob(res.data as Blob, `carburant_${annee}.xlsx`)
      toast.success('Export téléchargé.')
    } catch { toast.error("Erreur export.") }
  }

  // Série mensuelle
  const seriesMois = (rapport?.par_mois ?? []).map((m: any) => ({
    mois:    getMoisLabel(m.mois).slice(0, 3),
    Montant: Number(m.total_montant) || 0,
    Litres:  Number(m.total_litres)  || 0,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapport Carburant"
        subtitle={`Consommations ${annee}`}
        actions={
          <div className="flex gap-2">
            <select value={agenceId} onChange={e => setAgenceId(e.target.value)} className="input h-8 py-0 text-sm w-40">
              <option value="">Toutes agences</option>
              {agences.map((a: any) => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
            <select value={annee} onChange={e => setAnnee(parseInt(e.target.value))} className="input h-8 py-0 text-sm w-24">
              {annees.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleExcel} className="btn-secondary gap-2">
              <Download size={16} /> Excel
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({length:4}).map((_,i) => <div key={i} className="card p-4"><CardLoading rows={2} /></div>)}
        </div>
      ) : rapport ? (
        <div className="space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total dépensé',  value: formatCfa(rapport.total_montant),                          color: 'text-primary-700' },
              { label: 'Volume consommé',value: `${Number(rapport.total_litres ?? 0).toFixed(0)} L`,        color: 'text-gray-900' },
              { label: 'Ravitaillements',value: rapport.nb_pleins ?? 0,                                    color: 'text-gray-900' },
              { label: 'Conso moyenne',  value: rapport.conso_100km_moyen ? `${Number(rapport.conso_100km_moyen).toFixed(1)} L/100` : '—', color: 'text-gray-900' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-5 text-center">
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</dt>
                <dd className={`text-2xl font-bold ${color}`}>{value}</dd>
              </div>
            ))}
          </div>

          {/* Graphiques */}
          {seriesMois.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="card p-6">
                <h3 className="section-title">Dépenses mensuelles (FCFA)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={seriesMois}>
                    <defs>
                      <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#8E44AD" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8E44AD" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10 }} width={50} />
                    <Tooltip formatter={(v: any) => [formatCfa(v), 'Montant']} />
                    <Area type="monotone" dataKey="Montant" stroke="#8E44AD" fill="url(#cGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-6">
                <h3 className="section-title">Volume mensuel (litres)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={seriesMois}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip formatter={(v: any) => [`${v} L`, 'Litres']} />
                    <Bar dataKey="Litres" fill="#8E44AD" radius={[4,4,0,0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tableau mensuel */}
          {(rapport.par_mois ?? []).length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b">
                <h3 className="text-sm font-semibold text-gray-700">Détail mensuel {annee}</h3>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Mois</th>
                    <th className="text-right">Litres</th>
                    <th className="text-right">Montant</th>
                    <th className="text-right">Nb pleins</th>
                    <th className="text-right">Prix moy./L</th>
                  </tr>
                </thead>
                <tbody>
                  {(rapport.par_mois as any[]).map((m: any) => {
                    const prixMoy = m.nb_pleins > 0 && m.total_litres > 0
                      ? Math.round(m.total_montant / m.total_litres)
                      : null
                    return (
                      <tr key={m.mois}>
                        <td className="font-medium">{getMoisLabel(m.mois)}</td>
                        <td className="text-right font-mono">{Number(m.total_litres).toFixed(1)} L</td>
                        <td className="text-right font-semibold">{formatCfa(m.total_montant)}</td>
                        <td className="text-right">{m.nb_pleins}</td>
                        <td className="text-right text-gray-500 text-sm">
                          {prixMoy ? `${prixMoy.toLocaleString()} F/L` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td>Total</td>
                    <td className="text-right font-mono">{Number(rapport.total_litres ?? 0).toFixed(1)} L</td>
                    <td className="text-right text-primary-700">{formatCfa(rapport.total_montant)}</td>
                    <td className="text-right">{rapport.nb_pleins ?? 0}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-12">Aucune donnée pour {annee}</p>
      )}
    </div>
  )
}
