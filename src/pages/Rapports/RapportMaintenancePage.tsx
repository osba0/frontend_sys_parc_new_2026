import { useState } from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { rapportsApi } from "@/api/finance.api";
import PageHeader from "@/components/shared/PageHeader";
import { CardLoading } from "@/components/shared/LoadingPage";
import { formatCfa, getTypeOperationLabel, downloadBlob } from "@/utils";
import { useAgences } from "@/hooks";
import toast from "react-hot-toast";

const TYPE_COLORS: Record<string, string> = {
  entretien: "#2E86C1",
  reparation: "#E74C3C",
  pneu: "#7F8C8D",
  carrosserie: "#F39C12",
  equipement: "#9B59B6",
  visite_technique: "#1ABC9C",
  contravention: "#E67E22",
};

export default function RapportMaintenancePage() {
  const annees = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [agenceId, setAgenceId] = useState("");
  const { data: agences = [] } = useAgences();

  const { data: rapport, isLoading } = useQuery({
    queryKey: ["rapport-maintenance", annee, agenceId],
    queryFn: () =>
      rapportsApi
        .maintenance({
          annee,
          agence_id: agenceId || undefined,
        })
        .then((r) => r.data.data),
  });

  const handleExcel = async () => {
    try {
      const res = await rapportsApi.excelMaintenance({
        annee,
        agence_id: agenceId || undefined,
      });
      downloadBlob(res.data as Blob, `maintenance_${annee}.xlsx`);
      toast.success("Export téléchargé.");
    } catch {
      toast.error("Erreur lors de l'export.");
    }
  };

  // Backend retourne { totaux: { global, entretien, reparation, pneu, equipement, contravention, nb_interventions } }
  const totaux = rapport?.totaux;
  const totalGlobal = Number(totaux?.global ?? 0);
  const nbInterv = Number(totaux?.nb_interventions ?? 0);
  const coutMoyen = nbInterv > 0 ? totalGlobal / nbInterv : 0;

  // Construire par_type depuis les totaux
  const seriesType = [
    { key: "entretien", total: Number(totaux?.entretien ?? 0) },
    { key: "reparation", total: Number(totaux?.reparation ?? 0) },
    { key: "pneu", total: Number(totaux?.pneu ?? 0) },
    { key: "equipement", total: Number(totaux?.equipement ?? 0) },
    { key: "contravention", total: Number(totaux?.contravention ?? 0) },
    { key: "visite_technique", total: Number(totaux?.visite_technique ?? 0) },
  ]
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((t) => ({
      ...t,
      name: getTypeOperationLabel(t.key),
      color: TYPE_COLORS[t.key] ?? "#BDC3C7",
    }));

  // par_vehicule → top_vehicules
  const topVehicules = (rapport?.par_vehicule ?? []) as any[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapport Maintenance"
        subtitle={`Analyse des interventions ${annee}`}
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
            <button onClick={handleExcel} className="btn-secondary gap-2">
              <Download size={16} /> Excel
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4">
              <CardLoading rows={2} />
            </div>
          ))}
        </div>
      ) : rapport ? (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total dépensé",
                value: formatCfa(totalGlobal),
                color: "text-primary-700",
              },
              {
                label: "Interventions",
                value: nbInterv,
                color: "text-gray-900",
              },
              {
                label: "Coût moyen",
                value: formatCfa(coutMoyen),
                color: "text-gray-900",
              },
              {
                label: "Véhicules traités",
                value: topVehicules.length,
                color: "text-gray-900",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-5 text-center">
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  {label}
                </dt>
                <dd className={`text-2xl font-bold ${color}`}>{value}</dd>
              </div>
            ))}
          </div>

          {/* Graphique par type */}
          {seriesType.length > 0 && (
            <div className="card p-6">
              <h3 className="section-title">
                Répartition par type d'opération
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={seriesType}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={120}
                    />
                    <Tooltip
                      formatter={(v: any) => [formatCfa(v), "Montant"]}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={22}>
                      {seriesType.map((t, i) => (
                        <Cell key={i} fill={t.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {seriesType.map((t) => (
                    <div
                      key={t.key}
                      className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-sm"
                          style={{ background: t.color }}
                        />
                        <span className="text-gray-700">{t.name}</span>
                      </div>
                      <span className="font-semibold">
                        {formatCfa(t.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top véhicules */}
          {topVehicules.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b">
                <h3 className="text-sm font-semibold text-gray-700">
                  Top véhicules — coût maintenance
                </h3>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-8">#</th>
                    <th>Immatriculation</th>
                    <th>Modèle</th>
                    <th className="text-right">Nb interventions</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topVehicules.map((v: any, i: number) => (
                    <tr key={v.vehicule_id}>
                      <td
                        className={`font-bold text-xs ${i < 3 ? "text-yellow-500" : "text-gray-400"}`}
                      >
                        {i + 1}
                      </td>
                      <td className="font-mono font-semibold text-primary-700">
                        {v.immatriculation}
                      </td>
                      <td className="text-sm text-gray-600">
                        {v.marque_modele ?? `${v.marque} ${v.modele}`}
                      </td>
                      <td className="text-right">{v.nb}</td>
                      <td className="text-right font-semibold">
                        {formatCfa(v.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top fournisseurs */}
          {(rapport.par_fournisseur ?? []).length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b">
                <h3 className="text-sm font-semibold text-gray-700">
                  Top fournisseurs / garages
                </h3>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fournisseur</th>
                    <th className="text-right">Nb</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(rapport.par_fournisseur as any[]).map((f: any) => (
                    <tr key={f.fournisseur_id}>
                      <td>{f.nom}</td>
                      <td className="text-right">{f.nb}</td>
                      <td className="text-right font-semibold">
                        {formatCfa(f.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
