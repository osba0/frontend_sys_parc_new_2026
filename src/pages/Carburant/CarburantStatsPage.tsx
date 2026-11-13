import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { carburantApi } from "@/api/finance.api";
import { useAgences } from "@/hooks";
import PageHeader from "@/components/shared/PageHeader";
import { CardLoading } from "@/components/shared/LoadingPage";
import { formatCfa, formatKm, getMoisLabel } from "@/utils";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-gray-600">{p.name} :</span>
          <span className="font-medium">
            {p.name === "Montant"
              ? formatCfa(p.value)
              : `${Number(p.value).toFixed(1)} ${p.name === "Litres" ? "L" : ""}`}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CarburantStatsPage() {
  const navigate = useNavigate();
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [agenceId, setAgenceId] = useState("");

  const { data: agences = [] } = useAgences();
  const annees = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  const { data: stats, isLoading } = useQuery({
    queryKey: ["carburant-stats", annee, agenceId],
    queryFn: () =>
      carburantApi
        .stats({ annee, agence_id: agenceId ? parseInt(agenceId) : undefined })
        .then((r) => r.data.data),
  });

  // Série mensuelle — clés exactes du backend : total_montant, total_litres, nb_pleins
  const seriesMois = (stats?.par_mois ?? []).map((m: any) => ({
    mois: getMoisLabel(m.mois).slice(0, 3),
    Montant: Number(m.total_montant) || 0,
    Litres: Number(m.total_litres) || 0,
    Pleins: Number(m.nb_pleins) || 0,
  }));

  type SerieMois = {
    mois: string;
    Montant: number;
    Litres: number;
    Pleins: number;
  };
  const totalMontant = seriesMois.reduce(
    (s: number, m: SerieMois) => s + m.Montant,
    0,
  );
  const totalLitres = seriesMois.reduce(
    (s: number, m: SerieMois) => s + m.Litres,
    0,
  );
  const totalPleins = seriesMois.reduce(
    (s: number, m: SerieMois) => s + m.Pleins,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques Carburant"
        subtitle={`Analyse des consommations ${annee}`}
        backTo="/carburant"
        actions={
          <div className="flex gap-2">
            <select
              value={agenceId}
              onChange={(e) => setAgenceId(e.target.value)}
              className="input h-8 py-0 text-sm w-40"
            >
              <option value="">Toutes agences</option>
              {agences.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
            <select
              value={annee}
              onChange={(e) => setAnnee(parseInt(e.target.value))}
              className="input h-8 py-0 text-sm w-24"
            >
              {annees.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4">
              <CardLoading rows={2} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total dépensé",
                value: formatCfa(totalMontant),
                sub: `${annee}`,
                color: "text-primary-700",
              },
              {
                label: "Total litres",
                value: `${totalLitres.toFixed(0)} L`,
                sub: "consommés",
                color: "text-gray-900",
              },
              {
                label: "Ravitaillements",
                value: totalPleins,
                sub: "pleins effectués",
                color: "text-gray-900",
              },
              {
                label: "Conso moyenne",
                value: stats?.conso_100km_moyen
                  ? `${Number(stats.conso_100km_moyen).toFixed(1)} L/100km`
                  : "—",
                sub: "sur le parc",
                color: "text-gray-900",
              },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="card p-5 text-center">
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  {label}
                </dt>
                <dd className={`text-2xl font-bold ${color}`}>{value}</dd>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Dépenses mensuelles */}
            <div className="card p-6">
              <h3 className="section-title">Dépenses mensuelles {annee}</h3>
              {seriesMois.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={seriesMois}
                    margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      tick={{ fontSize: 10 }}
                      width={55}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="Montant"
                      fill="#8E44AD"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={35}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">
                  Aucune donnée pour {annee}
                </div>
              )}
            </div>

            {/* Litres consommés */}
            <div className="card p-6">
              <h3 className="section-title">Litres consommés par mois</h3>
              {seriesMois.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={seriesMois}
                    margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} width={45} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="Litres"
                      stroke="#8E44AD"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#8E44AD" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">
                  Aucune donnée pour {annee}
                </div>
              )}
            </div>
          </div>

          {/* Top véhicules consommateurs */}
          {(stats?.par_vehicule?.length ?? 0) > 0 && (
            <div className="card p-6">
              <h3 className="section-title">
                Top véhicules — consommation {annee}
              </h3>
              <div className="space-y-2">
                {(stats!.par_vehicule as any[])
                  .slice(0, 10)
                  .map((v: any, i: number) => {
                    const maxTotal = Number(
                      stats!.par_vehicule[0]?.total_consomme ?? 1,
                    );
                    const pct = Math.round(
                      (Number(v.total_consomme) / maxTotal) * 100,
                    );
                    return (
                      <div
                        key={v.vehicule_id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/vehicules/${v.vehicule_id}`)}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            i === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : i === 1
                                ? "bg-gray-100 text-gray-600"
                                : i === 2
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-gray-50 text-gray-500"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <span className="font-mono font-semibold text-primary-700 w-28 flex-shrink-0 text-sm">
                          {v.immatriculation}
                        </span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 text-right">
                          <span className="text-xs text-gray-400">
                            {Number(v.total_litres).toFixed(0)} L
                          </span>
                          <span className="font-semibold text-sm text-gray-800 w-28 text-right">
                            {formatCfa(v.total_consomme)}
                          </span>
                          <span className="text-xs text-gray-400 w-12 text-right">
                            {v.nb_pleins} pleins
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
