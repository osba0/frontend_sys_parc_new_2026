import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { rapportsApi } from "@/api/finance.api";
import PageHeader from "@/components/shared/PageHeader";
import { CardLoading } from "@/components/shared/LoadingPage";
import { formatCfa, downloadBlob } from "@/utils";
import { useAgences } from "@/hooks";
import toast from "react-hot-toast";

export default function RapportTcoPage() {
  const navigate = useNavigate();
  const annees = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [agenceId, setAgenceId] = useState("");
  const { data: agences = [] } = useAgences();

  const { data: rapport, isLoading } = useQuery({
    queryKey: ["rapport-tco", annee, agenceId],
    queryFn: () =>
      rapportsApi
        .tco({
          annee,
          agence_id: agenceId || undefined,
        })
        .then((r) => r.data.data),
  });

  const handleExcel = async () => {
    try {
      const res = await rapportsApi.excelParcGlobal({
        annee,
        agence_id: agenceId || undefined,
      });
      downloadBlob(res.data as Blob, `tco_parc_${annee}.xlsx`);
      toast.success("Export téléchargé.");
    } catch {
      toast.error("Erreur export.");
    }
  };

  const vehicules = (rapport?.vehicules ?? []) as any[];
  const totalGlobal = vehicules.reduce(
    (s: number, v: any) => s + Number(v.total_global ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="TCO Parc"
        subtitle={`Coût total de possession ${annee}`}
        actions={
          <div className="flex flex-wrap gap-2">
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
            <button onClick={handleExcel} className="btn-secondary gap-2">
              <Download size={16} /> Excel
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4">
              <CardLoading rows={2} />
            </div>
          ))}
        </div>
      ) : rapport ? (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                label: "TCO Total parc",
                value: formatCfa(rapport.total_global),
                color: "text-primary-700",
              },
              {
                label: "Maintenance",
                value: formatCfa(rapport.total_maintenance),
                color: "text-red-600",
              },
              {
                label: "Carburant",
                value: formatCfa(rapport.total_carburant),
                color: "text-purple-600",
              },
              {
                label: "Pneumatiques",
                value: formatCfa(rapport.total_pneus ?? 0),
                color: "text-gray-600",
              },
              {
                label: "Bons commande",
                value: formatCfa(rapport.total_bons_commande ?? 0),
                color: "text-orange-600",
              },
              {
                label: "Nb véhicules",
                value: vehicules.length,
                color: "text-gray-800",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-4 text-center">
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  {label}
                </dt>
                <dd className={`text-xl font-bold ${color}`}>{value}</dd>
              </div>
            ))}
          </div>

          {/* Tableau détail véhicules */}
          {vehicules.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  Détail TCO par véhicule ({vehicules.length})
                </h3>
                <span className="text-xs text-gray-400">
                  Cliquer sur un véhicule pour voir sa fiche
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-8">#</th>
                      <th>Véhicule</th>
                      <th className="text-right">Maintenance</th>
                      <th className="text-right">Carburant</th>
                      <th className="text-right">Pneus</th>
                      <th className="text-right">B. Commande</th>
                      <th className="text-right font-bold text-primary-700">
                        Total TCO
                      </th>
                      <th className="text-right">% Parc</th>
                      <th className="text-right">FCFA/km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicules
                      .sort(
                        (a: any, b: any) =>
                          Number(b.total_global) - Number(a.total_global),
                      )
                      .map((v: any, i: number) => {
                        const total = Number(v.total_global ?? 0);
                        const pct =
                          totalGlobal > 0
                            ? ((total / totalGlobal) * 100).toFixed(1)
                            : "0";
                        return (
                          <tr
                            key={v.vehicule_id}
                            className="cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={() =>
                              navigate(`/vehicules/${v.vehicule_id}`)
                            }
                          >
                            <td
                              className={`font-bold text-xs ${i < 3 ? "text-yellow-500" : "text-gray-300"}`}
                            >
                              {i + 1}
                            </td>
                            <td>
                              <div className="font-mono font-semibold text-primary-700">
                                {v.immatriculation}
                              </div>
                              {v.marque_modele && (
                                <div className="text-xs text-gray-400">
                                  {v.marque_modele}
                                </div>
                              )}
                            </td>
                            <td className="text-right text-sm">
                              {formatCfa(v.total_maintenance)}
                            </td>
                            <td className="text-right text-sm">
                              {formatCfa(v.total_carburant)}
                            </td>
                            <td className="text-right text-sm">
                              {formatCfa(v.total_pneus ?? 0)}
                            </td>
                            <td className="text-right text-sm">
                              {formatCfa(v.total_bons_commande ?? 0)}
                            </td>
                            <td className="text-right font-bold text-primary-700">
                              {formatCfa(total)}
                            </td>
                            <td className="text-right text-sm">
                              <div className="flex items-center justify-end gap-1">
                                <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary-400 rounded-full"
                                    style={{
                                      width: `${Math.min(parseFloat(pct), 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-gray-500 text-xs">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                            <td className="text-right text-xs text-gray-500">
                              {v.cout_par_km
                                ? `${Number(v.cout_par_km).toFixed(0)} F`
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={6} className="text-right text-primary-700">
                        Total parc
                      </td>
                      <td className="text-right text-primary-700 text-base">
                        {formatCfa(totalGlobal)}
                      </td>
                      <td className="text-right text-gray-500 text-xs">100%</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-12">
          Aucune donnée pour {annee}
        </p>
      )}
    </div>
  );
}
