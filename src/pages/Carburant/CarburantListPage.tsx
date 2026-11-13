import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  BarChart3,
  Download,
  Fuel,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw,
  Search,
  AlertTriangle,
  MapPin,
  User,
  ChevronRight,
  Clock,
  Zap,
  Filter,
  Droplets,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { carburantApi, rapportsApi } from "@/api/finance.api";
import { useAgences } from "@/hooks";
import PageHeader from "@/components/shared/PageHeader";
import { useAuthStore } from "@/stores/authStore";
import { useConfigStore } from "@/stores/configStore";
import { formatDate, formatCfa, downloadBlob, cn } from "@/utils";
import { CardLoading } from "@/components/shared/LoadingPage";
import PlaqueSN from "@/components/shared/PlaqueSN";
import toast from "react-hot-toast";

// ─── Types période ────────────────────────────────────────────
type Periode = "today" | "week" | "month" | "year" | "custom";

function getPeriode(type: Periode): { debut: string; fin: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (type) {
    case "today":
      return { debut: fmt(now), fin: fmt(now) };
    case "week": {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay() + 1);
      return { debut: fmt(d), fin: fmt(now) };
    }
    case "month":
      return {
        debut: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        fin: fmt(now),
      };
    case "year":
      return { debut: `${now.getFullYear()}-01-01`, fin: fmt(now) };
    default:
      return {
        debut: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        fin: fmt(now),
      };
  }
}

const PERIODE_LABELS: Record<Periode, string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
  custom: "Personnalisée",
};

// ─── Helpers ──────────────────────────────────────────────────
const CARB_COLORS: Record<string, string> = {
  Diesel: "bg-blue-100 text-blue-700 border-blue-200",
  Essence: "bg-green-100 text-green-700 border-green-200",
  GPL: "bg-purple-100 text-purple-700 border-purple-200",
};
const PIE_COLORS = [
  "#1e3a5f",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6b7280",
];

function consoClass(v: number) {
  if (v <= 12) return "text-green-600 bg-green-50";
  if (v <= 25) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

function EvoChip({ val }: { val: number | null }) {
  if (val === null) return null;
  const up = val > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.5 rounded-full",
        up
          ? "text-red-600 bg-red-50"
          : val < 0
            ? "text-green-600 bg-green-50"
            : "text-gray-500 bg-gray-50",
      )}
    >
      {up ? (
        <TrendingUp size={9} />
      ) : val < 0 ? (
        <TrendingDown size={9} />
      ) : (
        <Minus size={9} />
      )}
      {val > 0 ? "+" : ""}
      {val}%
    </span>
  );
}

function AlerteCard({ a }: { a: any }) {
  const cfgs: Record<string, { bg: string; icon: React.ReactNode }> = {
    surconsommation: {
      bg: "border-red-200 bg-red-50",
      icon: <Zap size={13} className="text-red-500" />,
    },
    hors_horaires: {
      bg: "border-yellow-200 bg-yellow-50",
      icon: <Clock size={13} className="text-yellow-600" />,
    },
  };
  const c = cfgs[a.type] ?? cfgs.surconsommation;
  return (
    <div className={cn("rounded-xl border p-3 flex items-start gap-2", c.bg)}>
      <span className="flex-shrink-0 mt-0.5">{c.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-800">{a.titre}</p>
        <p className="text-xs text-gray-600 mt-0.5 leading-snug">
          {a.description}
        </p>
        {a.immatriculation && (
          <div className="mt-1.5">
            <PlaqueSN
              immatriculation={a.immatriculation}
              style={a.style_plaque ?? "nouvelle"}
              size="xs"
            />
          </div>
        )}
      </div>
      {a.valeur && (
        <span className="text-xs font-bold text-gray-700 flex-shrink-0">
          {a.valeur} L/100
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function CarburantListPage() {
  const navigate = useNavigate();
  const { hasRole, user } = useAuthStore();
  const { config } = useConfigStore();
  const { data: agences = [] } = useAgences({ enabled: !hasRole("chauffeur") });

  const estChauffeur = hasRole("chauffeur");
  const peutCreer =
    hasRole("super_admin", "directeur", "resp_parc", "resp_agence") ||
    (estChauffeur && !!config?.chauffeur_peut_saisir_carburant);

  const [periode, setPeriode] = useState<Periode>("month");
  const [persoDebut, setPersoDebut] = useState("");
  const [persoFin, setPersoFin] = useState("");
  const [agenceId, setAgenceId] = useState("");
  const [vehicule, setVehicule] = useState("");
  const [typeCarb, setTypeCarb] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const range =
    periode === "custom"
      ? { debut: persoDebut, fin: persoFin }
      : getPeriode(periode);

  const resetFiltres = () => {
    setPeriode("month");
    setAgenceId("");
    setVehicule("");
    setTypeCarb("");
    setSearch("");
    setPage(1);
  };

  // Queries
  const kpiQuery = useQuery({
    queryKey: ["carburant-kpi", range, agenceId],
    queryFn: () =>
      carburantApi
        .kpi({
          debut: range.debut || undefined,
          fin: range.fin || undefined,
          agence_id: agenceId ? Number(agenceId) : undefined,
        })
        .then((r) => r.data.data),
    staleTime: 60_000,
    enabled: !estChauffeur,
  });

  const listQuery = useQuery({
    queryKey: [
      "carburant-list",
      { page, range, agenceId, vehicule, typeCarb, estChauffeur },
    ],
    queryFn: () =>
      carburantApi
        .list({
          page,
          per_page: 20,
          sort: "-date",
          include: "vehicule,chauffeur",
          "filter[periode_debut]": range.debut || undefined,
          "filter[periode_fin]": range.fin || undefined,
          "filter[agence_id]": agenceId || undefined,
          "filter[immatriculation]": vehicule || undefined,
          "filter[type_carburant]": typeCarb || undefined,
          ...(estChauffeur && user?.id
            ? { "filter[chauffeur_user_id]": user.id }
            : {}),
        })
        .then((r) => r.data),
  });

  const kpi = kpiQuery.data;
  const list = listQuery.data;

  const rows = useMemo(() => {
    const raw = list?.data ?? [];
    if (!search) return raw;
    const q = search.toLowerCase();
    return raw.filter(
      (c: any) =>
        c.vehicule?.immatriculation?.toLowerCase().includes(q) ||
        c.station?.toLowerCase().includes(q) ||
        c.chauffeur?.nom?.toLowerCase().includes(q),
    );
  }, [list?.data, search]);

  const handleExcel = async () => {
    try {
      const res = await rapportsApi.excelCarburant({
        agence_id: agenceId ? Number(agenceId) : undefined,
      });
      downloadBlob(
        res.data as Blob,
        `carburant_${range.debut}_${range.fin}.xlsx`,
      );
      toast.success("Export téléchargé.");
    } catch {
      toast.error("Erreur lors de l'export.");
    }
  };

  const KPI_DEFS = kpi
    ? ([
        {
          label: "Litres consommés",
          value: `${kpi.kpis.litres_total.toLocaleString()} L`,
          evo: kpi.kpis.evo_litres,
          icon: <Droplets size={15} />,
          color: "bg-blue-600",
        },
        {
          label: "Dépense totale",
          value: formatCfa(kpi.kpis.montant_total),
          evo: kpi.kpis.evo_montant,
          icon: <TrendingUp size={15} />,
          color: "bg-violet-600",
        },
        {
          label: "Nb de pleins",
          value: kpi.kpis.nb_pleins,
          evo: kpi.kpis.evo_nb_pleins,
          icon: <Fuel size={15} />,
          color: "bg-emerald-600",
        },
        {
          label: "Conso. moy.",
          value: `${kpi.kpis.conso_moyenne} L/100`,
          evo: null,
          icon: <BarChart3 size={15} />,
          color: "bg-yellow-500",
        },
        {
          label: "Coût /100km",
          value: `${kpi.kpis.cout_100km} F`,
          evo: null,
          icon: <MapPin size={15} />,
          color: "bg-orange-500",
        },
        {
          label: "Alertes",
          value: kpi.alertes?.length ?? 0,
          evo: null,
          icon: <AlertTriangle size={15} />,
          color: "bg-red-600",
        },
      ] as const)
    : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title={estChauffeur ? "Mes pleins" : "Carburant — Consommation"}
        subtitle={`${list?.meta?.total ?? 0} enregistrement(s)`}
        actions={
          <div className="flex flex-wrap gap-2">
            {!estChauffeur && (
              <>
                <button
                  onClick={() => navigate("/carburant/stats")}
                  className="btn-secondary gap-2"
                >
                  <BarChart3 size={16} /> Stats
                </button>
                <button
                  onClick={() => navigate("/carburant/dotations")}
                  className="btn-secondary gap-2"
                >
                  <Fuel size={16} /> Dotations
                </button>
                <button onClick={handleExcel} className="btn-secondary gap-2">
                  <Download size={16} /> Excel
                </button>
              </>
            )}
            {peutCreer && (
              <button
                onClick={() => navigate("/carburant/nouveau")}
                className="btn-primary gap-2"
              >
                <Plus size={16} /> Ajouter un plein
              </button>
            )}
          </div>
        }
      />

      {/* ── KPIs ── */}
      {!estChauffeur && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiQuery.isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="card !p-0 overflow-hidden h-[68px] animate-pulse bg-gray-100"
                />
              ))
            : KPI_DEFS.map((k, i) => (
                <div
                  key={i}
                  className="card !p-0 flex items-stretch overflow-hidden"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 flex-shrink-0 text-white",
                      k.color,
                    )}
                  >
                    {k.icon}
                  </div>
                  <div className="flex-1 px-2.5 py-2 min-w-0">
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {k.label}
                    </p>
                    <p className="text-sm font-bold text-gray-800 leading-tight">
                      {k.value}
                    </p>
                    <EvoChip val={k.evo} />
                  </div>
                </div>
              ))}
        </div>
      )}

      {/* ── Filtres ── */}
      <div className="card !p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-gray-400 flex-shrink-0" />
          {(["today", "week", "month", "year", "custom"] as Periode[]).map(
            (p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriode(p);
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                  periode === p
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {PERIODE_LABELS[p]}
              </button>
            ),
          )}
          {periode === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={persoDebut}
                onChange={(e) => setPersoDebut(e.target.value)}
                className="input h-7 py-0 text-xs w-32"
              />
              <span className="text-gray-400 text-xs">→</span>
              <input
                type="date"
                value={persoFin}
                onChange={(e) => setPersoFin(e.target.value)}
                className="input h-7 py-0 text-xs w-32"
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input h-8 pl-6 pr-2 text-xs w-36"
              placeholder="Plaque, station…"
            />
          </div>
          <select
            value={typeCarb}
            onChange={(e) => {
              setTypeCarb(e.target.value);
              setPage(1);
            }}
            className="input h-8 py-0 text-xs w-28"
          >
            <option value="">Tout type</option>
            {["Diesel", "Essence", "GPL"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={vehicule}
            onChange={(e) => {
              setVehicule(e.target.value);
              setPage(1);
            }}
            className="input h-8 py-0 text-xs w-32"
            placeholder="Immatriculation"
          />
          {!estChauffeur && (
            <select
              value={agenceId}
              onChange={(e) => {
                setAgenceId(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-xs w-36"
            >
              <option value="">Toutes agences</option>
              {agences.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={resetFiltres}
            className="btn-secondary h-8 px-3 gap-1 text-xs"
          >
            <RotateCcw size={12} /> Réinitialiser
          </button>
        </div>
      </div>

      {/* ── Tableau + Panneau Analytics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tableau */}
        <div className="lg:col-span-2 card !p-0 overflow-hidden">
          {listQuery.isLoading ? (
            <div className="p-6">
              <CardLoading rows={6} />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <Fuel size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Aucun plein trouvé</p>
              <p className="text-sm text-gray-400 mt-1">Ajustez vos filtres.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {[
                        "Date",
                        "Véhicule",
                        "Type",
                        "Station",
                        "Litres",
                        "L/100",
                        "Montant",
                        "Chauffeur",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left py-2.5 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((c: any) => (
                      <tr
                        key={c.id}
                        className="hover:bg-gray-50 transition-colors group"
                      >
                        <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(c.date)}
                        </td>
                        <td className="py-2.5 px-3">
                          {c.vehicule?.immatriculation ? (
                            <PlaqueSN
                              immatriculation={c.vehicule.immatriculation}
                              style={c.vehicule.style_plaque ?? "nouvelle"}
                              size="xs"
                            />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                              CARB_COLORS[c.type_carburant] ??
                                "bg-gray-100 text-gray-600 border-gray-200",
                            )}
                          >
                            {c.type_carburant ?? "Diesel"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <MapPin
                              size={9}
                              className="text-gray-400 flex-shrink-0"
                            />
                            {c.station ?? "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs font-medium">
                          {Number(c.litres).toFixed(1)} L
                        </td>
                        <td className="py-2.5 px-3">
                          {c.conso_100km ? (
                            <span
                              className={cn(
                                "text-xs font-bold px-1.5 py-0.5 rounded",
                                consoClass(Number(c.conso_100km)),
                              )}
                            >
                              {Number(c.conso_100km).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs font-semibold text-gray-800">
                          {formatCfa(c.montant)}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User size={9} className="flex-shrink-0" />
                            {c.chauffeur?.nom ?? "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() =>
                              c.vehicule_id &&
                              navigate(`/vehicules/${c.vehicule_id}`)
                            }
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-primary-600 flex items-center gap-0.5"
                          >
                            Voir <ChevronRight size={9} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {list?.meta && list.meta.last_page > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    Page {list.meta.current_page} / {list.meta.last_page} —{" "}
                    {list.meta.total} résultats
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
                    >
                      ←
                    </button>
                    <button
                      disabled={page >= list.meta.last_page}
                      onClick={() => setPage((p) => p + 1)}
                      className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
                    >
                      →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Analytics */}
        {!estChauffeur && (
          <div className="space-y-4">
            {/* Top stations donut */}
            {kpi?.top_stations?.length > 0 && (
              <div className="card p-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                  ⛽ Top stations
                </h4>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie
                      data={kpi.top_stations}
                      dataKey="litres"
                      nameKey="station"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={32}
                    >
                      {kpi.top_stations.map((_: any, i: number) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} L`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {kpi.top_stations.slice(0, 4).map((s: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="text-gray-600 truncate">
                          {s.station}
                        </span>
                      </div>
                      <span className="text-gray-800 font-semibold">
                        {s.litres} L
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top véhicules */}
            {kpi?.top_vehicules?.length > 0 && (
              <div className="card p-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                  🚗 Top véhicules
                </h4>
                <div className="space-y-2.5">
                  {kpi.top_vehicules.map((v: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <PlaqueSN
                        immatriculation={v.immatriculation ?? "—"}
                        style={v.style_plaque ?? "nouvelle"}
                        size="xs"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (v.litres / kpi.top_vehicules[0].litres) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 flex-shrink-0">
                        {v.litres} L
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top chauffeurs */}
            {kpi?.top_chauffeurs?.length > 0 && (
              <div className="card p-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                  👤 Top chauffeurs
                </h4>
                <div className="space-y-2">
                  {kpi.top_chauffeurs.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-primary-700">
                          {c.nom?.[0]}
                        </span>
                      </div>
                      <span className="flex-1 text-xs text-gray-600 truncate">
                        {c.nom}
                      </span>
                      <span className="text-xs font-semibold text-gray-800">
                        {c.litres} L
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Par type carburant */}
            {kpi?.par_type?.length > 0 && (
              <div className="card p-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                  🔥 Par type
                </h4>
                <div className="space-y-1.5">
                  {kpi.par_type.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          CARB_COLORS[t.type] ??
                            "bg-gray-100 text-gray-600 border-gray-200",
                        )}
                      >
                        {t.type}
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        {t.litres} L
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Alertes ── */}
      {!estChauffeur && kpi?.alertes?.length > 0 && (
        <div className="card p-4">
          <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
            <AlertTriangle size={15} className="text-red-500" />
            Alertes carburant ({kpi.alertes.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {kpi.alertes.map((a: any, i: number) => (
              <AlerteCard key={i} a={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
