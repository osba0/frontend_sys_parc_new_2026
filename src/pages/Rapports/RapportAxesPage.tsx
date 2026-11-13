import { useState } from 'react'
import { Route, TrendingUp, Fuel, Wrench, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { rapportsApi } from '@/api/finance.api'
import { useAgences } from '@/hooks'
import PageHeader from '@/components/shared/PageHeader'
import { CardLoading } from '@/components/shared/LoadingPage'
import { formatCfa } from '@/utils'

// ─────────────────────────────────────────────────────────────
// Composant barre de proportion
// ─────────────────────────────────────────────────────────────

function ProportionBar({
  maintenance, carburant, total,
}: { maintenance: number; carburant: number; total: number }) {
  if (total === 0) return <div className="h-2 bg-gray-100 rounded-full" />
  const pctM = Math.round((maintenance / total) * 100)
  const pctC = Math.round((carburant  / total) * 100)
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 gap-px">
      {pctM > 0 && (
        <div className="bg-orange-400 h-full transition-all" style={{ width: `${pctM}%` }}
          title={`Maintenance : ${pctM}%`} />
      )}
      {pctC > 0 && (
        <div className="bg-blue-400 h-full transition-all" style={{ width: `${pctC}%` }}
          title={`Carburant : ${pctC}%`} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────

export default function RapportAxesPage() {
  const [annee,     setAnnee]    = useState(new Date().getFullYear())
  const [agenceId,  setAgenceId] = useState('')
  const { data: agences = [] }   = useAgences()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rapport-axes', { annee, agenceId }],
    queryFn:  () => rapportsApi.axes({
      annee,
      agence_id: agenceId ? parseInt(agenceId) : undefined,
    }).then(r => r.data.data),
  })

  const totaux  = data?.totaux
  const parAxe  = (data?.par_axe ?? []) as any[]
  const maxCout = Math.max(...parAxe.map((a: any) => a.cout_total), 1)

  const annees = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rapport par axe de livraison"
        subtitle="Coûts maintenance + carburant ventilés par axe"
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Année</label>
          <select value={annee} onChange={e => setAnnee(parseInt(e.target.value))}
            className="input h-9 py-0 text-sm w-28">
            {annees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Agence</label>
          <select value={agenceId} onChange={e => setAgenceId(e.target.value)}
            className="input h-9 py-0 text-sm w-44">
            <option value="">Toutes agences</option>
            {(agences as any[]).map((a: any) => (
              <option key={a.id} value={a.id}>{a.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs globaux */}
      {totaux && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Coût total',
              value: formatCfa(totaux.cout_total),
              icon:  <TrendingUp size={18} />,
              color: 'text-primary-700',
              bg:    'bg-primary-50',
            },
            {
              label: 'Maintenance',
              value: formatCfa(totaux.cout_maintenance),
              icon:  <Wrench size={18} />,
              color: 'text-orange-600',
              bg:    'bg-orange-50',
            },
            {
              label: 'Carburant',
              value: formatCfa(totaux.cout_carburant),
              icon:  <Fuel size={18} />,
              color: 'text-blue-600',
              bg:    'bg-blue-50',
            },
            {
              label: 'Affectations',
              value: totaux.nb_affectations,
              icon:  <Users size={18} />,
              color: 'text-green-600',
              bg:    'bg-green-50',
            },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} className={`card p-4 ${bg}`}>
              <div className={`flex items-center gap-2 ${color} mb-1`}>
                {icon}
                <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
              </div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-400" /> Maintenance
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-400" /> Carburant
        </div>
      </div>

      {/* Tableau */}
      {isLoading ? (
        <CardLoading rows={8} />
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-red-500 text-sm">Erreur de chargement.</p>
          <button onClick={() => refetch()} className="btn-secondary mt-3">Réessayer</button>
        </div>
      ) : parAxe.length === 0 ? (
        <div className="card p-12 text-center">
          <Route size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Aucune donnée pour {annee}</p>
          <p className="text-gray-400 text-sm mt-1">
            Associez des axes de livraison aux maintenances et carburants.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className="w-8">#</th>
                  <th>Axe</th>
                  <th>Zone</th>
                  <th className="text-right">Maintenance</th>
                  <th className="text-right">Carburant</th>
                  <th className="text-right">Total</th>
                  <th className="w-40">Répartition</th>
                  <th className="text-right">Affect.</th>
                </tr>
              </thead>
              <tbody>
                {parAxe.map((axe: any, idx: number) => {
                  const pctDuMax = maxCout > 0 ? (axe.cout_total / maxCout) * 100 : 0
                  return (
                    <tr key={axe.axe_id}>
                      {/* Rang */}
                      <td className="text-xs text-gray-400 font-mono text-center">
                        {idx + 1}
                      </td>

                      {/* Nom axe */}
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded flex-shrink-0">
                            {axe.axe_code}
                          </span>
                          <div>
                            <div className="font-medium text-sm text-gray-900">{axe.axe_nom}</div>
                            {axe.agence && (
                              <div className="text-xs text-gray-400">{axe.agence}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Zone */}
                      <td className="text-xs text-gray-500">{axe.axe_zone ?? '—'}</td>

                      {/* Maintenance */}
                      <td className="text-right">
                        <div className="font-medium text-sm text-orange-600">
                          {formatCfa(axe.cout_maintenance)}
                        </div>
                        <div className="text-xs text-gray-400">{axe.nb_maintenances} interv.</div>
                      </td>

                      {/* Carburant */}
                      <td className="text-right">
                        <div className="font-medium text-sm text-blue-600">
                          {formatCfa(axe.cout_carburant)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {axe.litres_total > 0 ? `${axe.litres_total.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} L` : '—'}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="text-right">
                        <div className="font-bold text-sm text-gray-900">
                          {formatCfa(axe.cout_total)}
                        </div>
                        {/* Barre relative au max */}
                        <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-400 rounded-full transition-all"
                            style={{ width: `${pctDuMax}%` }}
                          />
                        </div>
                      </td>

                      {/* Répartition */}
                      <td className="pr-3">
                        <ProportionBar
                          maintenance={axe.cout_maintenance}
                          carburant={axe.cout_carburant}
                          total={axe.cout_total}
                        />
                        {axe.cout_total > 0 && (
                          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                            <span>
                              {Math.round(axe.cout_maintenance / axe.cout_total * 100)}% M
                            </span>
                            <span>
                              {Math.round(axe.cout_carburant / axe.cout_total * 100)}% C
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Affectations */}
                      <td className="text-right text-sm text-gray-600">
                        {axe.nb_affectations}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Total */}
              {totaux && (
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="font-bold text-sm text-gray-700 pl-4">
                      Total {annee}
                    </td>
                    <td className="text-right font-bold text-orange-600">
                      {formatCfa(totaux.cout_maintenance)}
                    </td>
                    <td className="text-right font-bold text-blue-600">
                      {formatCfa(totaux.cout_carburant)}
                    </td>
                    <td className="text-right font-bold text-gray-900">
                      {formatCfa(totaux.cout_total)}
                    </td>
                    <td>
                      <ProportionBar
                        maintenance={totaux.cout_maintenance}
                        carburant={totaux.cout_carburant}
                        total={totaux.cout_total}
                      />
                    </td>
                    <td className="text-right font-bold text-gray-700">
                      {totaux.nb_affectations}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Note explicative */}
      <div className="card p-4 bg-blue-50 border border-blue-100">
        <p className="text-xs text-blue-700">
          ℹ Ce rapport consolide uniquement les maintenances et carburants
          auxquels un axe de livraison a été associé. Pour enrichir ce rapport,
          renseignez l'axe lors de la saisie des maintenances et des pleins carburant.
        </p>
      </div>
    </div>
  )
}
