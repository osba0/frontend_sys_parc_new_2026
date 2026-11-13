import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  Download,
  Printer,
  ChevronLeft,
  Calendar,
  Car,
  Wrench,
  Fuel,
  CircleDot,
  AlertTriangle,
  ArrowLeftRight,
  TrendingUp,
  Clock,
  Shield,
  Activity,
  Copy,
  MapPin,
  Gauge,
  Ruler,
} from "lucide-react";
import { vehiculesApi } from "@/api/vehicules.api";
import { formatDate, formatCfa, formatKm, downloadBlob } from "@/utils";
import { CardLoading } from "@/components/shared/LoadingPage";
import toast from "react-hot-toast";
import PlaqueSN from "@/components/shared/PlaqueSN";

// ── Types ────────────────────────────────────────────────────
type Periode = "mois" | "trimestre" | "semestre" | "annee" | "perso";

function getPeriode(type: Periode): { debut: string; fin: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (type) {
    case "mois":
      return { debut: fmt(new Date(y, m, 1)), fin: fmt(new Date(y, m + 1, 0)) };
    case "trimestre": {
      const t = Math.floor(m / 3);
      return {
        debut: fmt(new Date(y, t * 3, 1)),
        fin: fmt(new Date(y, t * 3 + 3, 0)),
      };
    }
    case "semestre": {
      const s = m < 6 ? 0 : 6;
      return { debut: fmt(new Date(y, s, 1)), fin: fmt(new Date(y, s + 6, 0)) };
    }
    case "annee":
      return { debut: `${y}-01-01`, fin: `${y}-12-31` };
    default:
      return { debut: fmt(new Date(y, m, 1)), fin: fmt(now) };
  }
}

// ── Sous-composants ──────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  color = "gray",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-600",
    red: "bg-red-50 border-red-200 text-red-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    gray: "bg-gray-50 border-gray-200 text-gray-600",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="opacity-70">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-5">
        <span className="text-primary-600">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}

const TIMELINE_COLORS: Record<string, string> = {
  mise_en_service: "bg-green-500",
  affectation: "bg-blue-500",
  maintenance: "bg-yellow-500",
  signalement: "bg-red-400",
  pneumatique: "bg-gray-500",
  document: "bg-emerald-500",
};

// ── Page principale ──────────────────────────────────────────

export default function VehiculeFicheViePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [periode, setPeriode] = useState<Periode>("annee");
  const [perso, setPerso] = useState(getPeriode("annee"));
  const range = periode === "perso" ? perso : getPeriode(periode);

  const { data, isLoading, error } = useQuery({
    queryKey: ["fiche-vie", id, range.debut, range.fin],
    queryFn: () =>
      vehiculesApi
        .ficheVie(Number(id), range.debut, range.fin)
        .then((r) => r.data.data),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });

  const handlePrint = useCallback(() => window.print(), []);

  const handleExcelExport = useCallback(async () => {
    if (!id) return;
    toast.loading("Export Excel en cours…", { id: "fiche-vie-export" });
    try {
      const res = await vehiculesApi.ficheVieExcel(
        Number(id),
        range.debut,
        range.fin,
      );
      downloadBlob(
        res.data as Blob,
        `Fiche_Vie_${data?.vehicule?.immatriculation ?? id}_${range.debut}_${range.fin}.xlsx`,
      );
      toast.success("Export téléchargé.", { id: "fiche-vie-export" });
    } catch {
      toast.error("Erreur lors de l'export.", { id: "fiche-vie-export" });
    }
  }, [id, range, data]);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-icon">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText size={20} className="text-primary-600" />
              Fiche de Vie Véhicule
              {data && (
                <PlaqueSN
                  immatriculation={data.vehicule.immatriculation}
                  style={data.vehicule.style_plaque ?? "nouvelle"}
                  ville={data.vehicule.plaque_ville ?? ""}
                  codeVille={data.vehicule.plaque_code_ville ?? ""}
                  size="sm"
                />
              )}
            </h1>
            <p className="text-sm text-gray-500">
              Historique complet du cycle de vie
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExcelExport}
            className="btn-secondary gap-2"
            disabled={!data}
          >
            <Download size={16} /> Excel
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary gap-2"
            disabled={!data}
          >
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </div>

      {/* ── Sélecteur de période ── */}
      <div className="card p-4 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={16} className="text-primary-600 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 mr-2">
            Période :
          </span>
          {(
            [
              ["mois", "📅 Ce mois"],
              ["trimestre", "📊 Ce trimestre"],
              ["semestre", "📈 Ce semestre"],
              ["annee", "📆 Cette année"],
              ["perso", "🗓 Personnalisée"],
            ] as [Periode, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setPeriode(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                periode === k
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {l}
            </button>
          ))}
          {periode === "perso" && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={perso.debut}
                onChange={(e) =>
                  setPerso((p) => ({ ...p, debut: e.target.value }))
                }
                className="input h-8 py-0 text-xs w-36"
              />
              <span className="text-gray-400 text-xs">→</span>
              <input
                type="date"
                value={perso.fin}
                onChange={(e) =>
                  setPerso((p) => ({ ...p, fin: e.target.value }))
                }
                className="input h-8 py-0 text-xs w-36"
              />
            </div>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {range.debut} → {range.fin}
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6">
              <CardLoading rows={4} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="card p-8 text-center text-red-500">
          Erreur de chargement. Vérifiez vos droits d'accès.
        </div>
      )}

      {data && (
        <>
          {/* ── Infos générales ── */}
          {/* ── Informations générales — design fiche véhicule ── */}
          <div className="card overflow-hidden">
            {/* Header — même style que les autres sections */}
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-4 px-3 pt-3">
              <span className="text-primary-600">
                <Car size={18} />
              </span>
              Informations générales
              {/* Badge statut aligné à droite */}
              <span
                className={`ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                  data.vehicule.statut === "actif"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : data.vehicule.statut === "en_panne"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : data.vehicule.statut === "en_maintenance"
                        ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    data.vehicule.statut === "actif"
                      ? "bg-green-500"
                      : data.vehicule.statut === "en_panne"
                        ? "bg-red-500"
                        : data.vehicule.statut === "en_maintenance"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                  }`}
                />
                {data.vehicule.statut === "actif"
                  ? "Actif"
                  : data.vehicule.statut === "en_panne"
                    ? "En panne"
                    : data.vehicule.statut === "en_maintenance"
                      ? "En maintenance"
                      : data.vehicule.statut === "hors_service"
                        ? "Hors service"
                        : data.vehicule.statut}
              </span>
            </h3>

            <div className="p-3 flex gap-4 flex-wrap md:flex-nowrap">
              {/* Photo véhicule */}
              <div className="w-full md:w-48 flex-shrink-0">
                {data.vehicule.photo_principale_url ? (
                  <div className="relative rounded-2xl overflow-hidden bg-gray-50 h-36 flex items-center justify-center border border-gray-100">
                    <img
                      src={data.vehicule.photo_principale_url}
                      alt={data.vehicule.immatriculation}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback si l'image ne charge pas
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement!.classList.add(
                          "bg-blue-50",
                          "border-blue-100",
                        );
                      }}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl bg-blue-50 h-36 flex flex-col items-center justify-center border border-blue-100 gap-2">
                    <Car size={40} className="text-blue-300" />
                    <span className="text-xs text-blue-400">Pas de photo</span>
                  </div>
                )}
              </div>

              {/* Infos principales */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Ligne 1 : Immatriculation + Marque/Modèle + Année + Carburant */}
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Immatriculation — style plaque */}
                  <div className="flex items-center gap-2">
                    <PlaqueSN
                      immatriculation={data.vehicule.immatriculation}
                      style={data.vehicule.style_plaque ?? "nouvelle"}
                      ville={data.vehicule.plaque_ville ?? ""}
                      codeVille={data.vehicule.plaque_code_ville ?? ""}
                      size="md"
                    />
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          data.vehicule.immatriculation,
                        )
                      }
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copier"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  {/* Marque / Modèle */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                      Marque / Modèle
                    </p>
                    <p className="text-base font-bold text-gray-800 truncate">
                      {data.vehicule.marque} {data.vehicule.modele}
                    </p>
                  </div>

                  {/* Année */}
                  <div className="flex-shrink-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                      Année
                    </p>
                    <p className="text-base font-bold text-gray-800 flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      {data.vehicule.annee_fabrication ?? "—"}
                    </p>
                  </div>

                  {/* Carburant */}
                  <div className="flex-shrink-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                      Carburant
                    </p>
                    <p className="text-base font-bold text-gray-800 flex items-center gap-1">
                      <Fuel size={14} className="text-blue-500" />
                      {data.vehicule.energie ?? "—"}
                    </p>
                  </div>
                </div>

                {/* Séparateur */}
                <div className="border-t border-gray-100" />

                {/* Ligne 2 : Mise en service · Km · Agence */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">
                      Mise en service
                    </p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      <Calendar
                        size={16}
                        className="text-primary-400 flex-shrink-0"
                      />
                      {formatDate(data.vehicule.date_mise_circulation)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">
                      Kilométrage actuel
                    </p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      <Gauge
                        size={16}
                        className="text-primary-400 flex-shrink-0"
                      />
                      {formatKm(data.vehicule.kilometrage_actuel)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">N° châssis</p>
                    <p className="text-sm font-semibold text-gray-800 font-mono truncate">
                      {data.vehicule.numero_chassis ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Agence</p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      <MapPin
                        size={16}
                        className="text-primary-400 flex-shrink-0"
                      />
                      {data.vehicule.agence ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Exploitation ── */}
          <Section
            title="Exploitation sur la période"
            icon={<Activity size={18} />}
          >
            {/* Ligne 1 — KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                icon={<TrendingUp size={16} />}
                label="Km parcourus"
                value={formatKm(data.exploitation.km_parcourus)}
                color="blue"
              />
              <KpiCard
                icon={<ArrowLeftRight size={16} />}
                label="Missions"
                value={data.exploitation.nb_missions}
                color="purple"
              />
              <KpiCard
                icon={<Car size={16} />}
                label="Chauffeurs"
                value={data.exploitation.nb_chauffeurs}
                color="gray"
              />
              <KpiCard
                icon={<Clock size={16} />}
                label="Durée période"
                value={`${data.exploitation.jours_periode}j`}
                sub={`${data.exploitation.jours_periode * 24}h au total`}
                color="gray"
              />
            </div>

            <div className="border-t border-gray-100 my-4" />

            {/* Ligne 2 — Immobilisation · Disponibilité · Utilisation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Temps d'immobilisation */}
              <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔒</span>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">
                    Immobilisation
                  </p>
                  <span className="ml-auto text-[10px] bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full font-medium">
                    {data.exploitation.nb_immobilisations ?? 0} arrêt(s)
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-orange-700 leading-tight">
                  {Math.floor(data.exploitation.jours_immobilisation ?? 0)}j{" "}
                  <span className="text-lg font-semibold text-orange-400">
                    {Math.floor(
                      (data.exploitation.heures_immobilisation ?? 0) % 24,
                    )}
                    h
                  </span>
                </p>
                <p className="text-[10px] text-orange-400 mb-3">
                  Durée totale d'indisponibilité
                </p>
                <div className="grid grid-cols-2 gap-2 border-t border-orange-200 pt-3">
                  <div>
                    <p className="text-[10px] text-orange-400">Moy. / arrêt</p>
                    <p className="text-sm font-bold text-orange-600">
                      {(data.exploitation.nb_immobilisations ?? 0) > 0
                        ? `${Math.floor((data.exploitation.jours_immobilisation ?? 0) / (data.exploitation.nb_immobilisations ?? 1))}j`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-orange-400">Jours dispo</p>
                    <p className="text-sm font-bold text-orange-600">
                      {(() => {
                        const j = Math.floor(
                          data.exploitation.jours_exploitation ?? 0,
                        );
                        const h = Math.floor(
                          (data.exploitation.heures_exploitation ?? 0) % 24,
                        );
                        return h > 0 ? `${j}j ${h}h` : `${j}j`;
                      })()}
                    </p>
                  </div>
                </div>
                <p className="text-[9px] text-orange-300 mt-2 leading-snug">
                  Σ durées « En panne » / « En maintenance » → retour Actif
                </p>
              </div>

              {/* Taux de disponibilité */}
              <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✅</span>
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wide">
                    Taux de disponibilité
                  </p>
                </div>
                <p className="text-5xl font-extrabold text-green-700 leading-none">
                  {data.exploitation.taux_disponibilite}
                  <span className="text-2xl font-semibold text-green-400">
                    %
                  </span>
                </p>
                <div className="mt-3 h-2.5 bg-green-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, data.exploitation.taux_disponibilite)}%`,
                    }}
                  />
                </div>
                <div className="mt-auto pt-3 border-t border-green-200 mt-3">
                  <p className="text-[10px] text-green-500 leading-snug font-mono">
                    (T.période − T.immo) ÷ T.période
                  </p>
                  <p className="text-[10px] text-green-400 mt-0.5">
                    ({data.exploitation.jours_periode}j −{" "}
                    {Math.floor(data.exploitation.jours_immobilisation ?? 0)}j)
                    ÷ {data.exploitation.jours_periode}j
                  </p>
                </div>
              </div>

              {/* Taux d'utilisation */}
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📈</span>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                    Taux d'utilisation
                  </p>
                </div>
                <p className="text-5xl font-extrabold text-blue-700 leading-none">
                  {data.exploitation.taux_utilisation}
                  <span className="text-2xl font-semibold text-blue-400">
                    %
                  </span>
                </p>
                <div className="mt-3 h-2.5 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, data.exploitation.taux_utilisation)}%`,
                    }}
                  />
                </div>
                <div className="mt-auto pt-3 border-t border-blue-200 mt-3">
                  <p className="text-[10px] text-blue-500 leading-snug font-mono">
                    T.affectations ÷ T.disponibilité
                  </p>
                  <p className="text-[10px] text-blue-400 mt-0.5">
                    {data.exploitation.duree_affectations_jours ?? "—"}j
                    affectés ÷{" "}
                    {data.exploitation.jours_disponibilite ??
                      data.exploitation.jours_exploitation}
                    j disponibles
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Maintenance + Incidents côte à côte ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Maintenance" icon={<Wrench size={18} />}>
              <div className="space-y-1">
                <Stat
                  label="Total interventions"
                  value={data.maintenance.nb_total}
                />
                <Stat
                  label="Préventives"
                  value={data.maintenance.nb_preventives}
                />
                <Stat
                  label="Correctives"
                  value={data.maintenance.nb_correctives}
                />
                <Stat label="Urgentes" value={data.maintenance.nb_urgentes} />
                <Stat
                  label="Coût total"
                  value={
                    <span className="text-red-600">
                      {formatCfa(data.maintenance.cout_total)}
                    </span>
                  }
                />
                <Stat
                  label="Coût moyen / intervention"
                  value={formatCfa(data.maintenance.cout_moyen)}
                />
              </div>
            </Section>

            <Section
              title="Signalements & Incidents"
              icon={<AlertTriangle size={18} />}
            >
              <div className="space-y-1">
                <Stat
                  label="Total signalements"
                  value={data.incidents.nb_signalements}
                />
                {Object.entries(data.incidents.repartition_gravite ?? {}).map(
                  ([g, n]) => (
                    <Stat key={g} label={`Gravité ${g}`} value={n as number} />
                  ),
                )}
                {Object.entries(data.incidents.repartition_statut ?? {}).map(
                  ([s, n]) => (
                    <Stat key={s} label={`Statut ${s}`} value={n as number} />
                  ),
                )}
              </div>
            </Section>

            <Section title="Pneumatiques" icon={<CircleDot size={18} />}>
              <div className="space-y-1">
                <Stat
                  label="Opérations"
                  value={data.pneumatiques.nb_operations}
                />
                <Stat
                  label="Remplacements"
                  value={data.pneumatiques.nb_remplacements}
                />
                <Stat
                  label="Coût total"
                  value={formatCfa(data.pneumatiques.cout_total)}
                />
                <Stat
                  label="Km moyen / pneu"
                  value={formatKm(data.pneumatiques.km_moyen_par_pneu)}
                />
              </div>
            </Section>

            <Section title="Carburant" icon={<Fuel size={18} />}>
              <div className="space-y-1">
                <Stat
                  label="Nombre de pleins"
                  value={data.carburant.nb_pleins}
                />
                <Stat
                  label="Litres consommés"
                  value={`${data.carburant.litres_total} L`}
                />
                <Stat
                  label="Coût total"
                  value={formatCfa(data.carburant.cout_total)}
                />
                <Stat
                  label="Prix moyen / litre"
                  value={`${data.carburant.cout_au_litre} FCFA`}
                />
                <Stat
                  label="Conso moyenne"
                  value={`${data.carburant.conso_moyenne} L/100km`}
                />
              </div>
            </Section>
          </div>

          {/* ── Analyse financière & TCO ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Analyse financière" icon={<TrendingUp size={18} />}>
              <div className="space-y-1">
                <Stat
                  label="Maintenance"
                  value={
                    <span className="text-yellow-600">
                      {formatCfa(data.financier.maintenance)}
                    </span>
                  }
                />
                <Stat
                  label="Carburant"
                  value={
                    <span className="text-purple-600">
                      {formatCfa(data.financier.carburant)}
                    </span>
                  }
                />
                <Stat
                  label="Pneumatiques"
                  value={
                    <span className="text-gray-600">
                      {formatCfa(data.financier.pneumatiques)}
                    </span>
                  }
                />
                <Stat
                  label="Assurance"
                  value={
                    <span className="text-green-600">
                      {formatCfa(data.financier.assurance)}
                    </span>
                  }
                />
                <Stat
                  label="Taxes & autres"
                  value={formatCfa(
                    (data.financier.taxes ?? 0) + (data.financier.autres ?? 0),
                  )}
                />
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <Stat
                    label="TOTAL"
                    value={
                      <span className="text-lg font-bold text-primary-700">
                        {formatCfa(data.financier.total)}
                      </span>
                    }
                  />
                </div>
              </div>
            </Section>

            <Section
              title="TCO — Coût total de possession"
              icon={<Shield size={18} />}
            >
              <div className="space-y-3">
                <div className="rounded-xl bg-primary-50 border border-primary-200 p-4 text-center">
                  <p className="text-xs text-primary-400 uppercase tracking-wide mb-1">
                    TCO sur la période
                  </p>
                  <p className="text-3xl font-bold text-primary-700">
                    {formatCfa(data.tco.tco_periode)}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-gray-50 p-2 text-center border border-gray-100">
                    <p className="text-xs text-gray-400">TCO annuel</p>
                    <p className="text-sm font-bold text-gray-700">
                      {formatCfa(data.tco.tco_annuel)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2 text-center border border-gray-100">
                    <p className="text-xs text-gray-400">/ km</p>
                    <p className="text-sm font-bold text-gray-700">
                      {data.tco.cout_par_km} F
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2 text-center border border-gray-100">
                    <p className="text-xs text-gray-400">/ jour</p>
                    <p className="text-sm font-bold text-gray-700">
                      {data.tco.cout_par_jour} F
                    </p>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* ── Graphiques ── */}
          <Section title="Visualisations" icon={<Activity size={18} />}>
            <div className="space-y-8">
              {/* Évolution Km mensuelle */}
              {data.graphiques.evolution_km.length > 1 && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-3">
                    📈 Kilométrage mensuel
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={data.graphiques.evolution_km}
                      margin={{ left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(v: any) => [
                          `${v.toLocaleString()} km`,
                          "Km",
                        ]}
                      />
                      <Bar dataKey="km" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Évolution dépenses */}
              {data.graphiques.evolution_depenses.length > 1 && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-3">
                    💸 Dépenses mensuelles
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={data.graphiques.evolution_depenses}
                      margin={{ left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip formatter={(v: any) => [formatCfa(v), ""]} />
                      <Legend />
                      <Bar
                        dataKey="maintenance"
                        stackId="a"
                        fill="#f59e0b"
                        name="Maintenance"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="carburant"
                        stackId="a"
                        fill="#8b5cf6"
                        name="Carburant"
                      />
                      <Bar
                        dataKey="pneumatiques"
                        stackId="a"
                        fill="#6b7280"
                        name="Pneumatiques"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Répartition coûts */}
              {data.graphiques.repartition_couts.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-3">
                    🥧 Répartition des coûts
                  </p>
                  <div className="flex items-center gap-6 flex-wrap">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie
                          data={data.graphiques.repartition_couts}
                          dataKey="valeur"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                        >
                          {data.graphiques.repartition_couts.map(
                            (entry: any, i: number) => (
                              <Cell key={i} fill={entry.couleur} />
                            ),
                          )}
                        </Pie>
                        <Tooltip formatter={(v: any) => [formatCfa(v), ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {data.graphiques.repartition_couts.map(
                        (item: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.couleur }}
                            />
                            <span className="text-gray-600">{item.label}</span>
                            <span className="font-semibold text-gray-800 ml-1">
                              {formatCfa(item.valeur)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ── Historique kilométrage ── */}
          {data.kilometrage?.historique?.length > 0 && (
            <Section title="Historique kilométrage" icon={<Ruler size={18} />}>
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-center">
                  <p className="text-xs text-indigo-400 mb-0.5">Nb relevés</p>
                  <p className="text-xl font-bold text-indigo-700">
                    {data.kilometrage.nb_releves}
                  </p>
                </div>
                <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-center">
                  <p className="text-xs text-indigo-400 mb-0.5">Km début</p>
                  <p className="text-sm font-bold text-indigo-700">
                    {formatKm(data.kilometrage.km_debut)}
                  </p>
                </div>
                <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-center">
                  <p className="text-xs text-indigo-400 mb-0.5">Km fin</p>
                  <p className="text-sm font-bold text-indigo-700">
                    {formatKm(data.kilometrage.km_fin)}
                  </p>
                </div>
              </div>

              {/* Tableau */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">
                        Date
                      </th>
                      <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500">
                        Km avant
                      </th>
                      <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500">
                        Km après
                      </th>
                      <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500">
                        +Δ km
                      </th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">
                        Source
                      </th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.kilometrage.historique.map((h: any, i: number) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                          {formatDate(h.date)}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-500 font-mono text-xs">
                          {formatKm(h.km_avant)}
                        </td>
                        <td className="py-2 pr-4 text-right font-semibold text-gray-800 font-mono text-xs">
                          {formatKm(h.km_apres)}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          <span className="text-xs font-semibold text-green-600">
                            +{formatKm(h.km_delta)}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              h.source === "saisie_manuelle"
                                ? "bg-indigo-100 text-indigo-700"
                                : h.source === "plein_carburant"
                                  ? "bg-purple-100 text-purple-700"
                                  : h.source === "maintenance"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {h.source_label}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-gray-400">
                          {h.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ── Timeline ── */}
          <Section
            title="Timeline — Chronologie du véhicule"
            icon={<Clock size={18} />}
          >
            {data.timeline.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Aucun événement sur cette période.
              </p>
            ) : (
              <div className="relative">
                {/* Ligne verticale */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-4 pl-10">
                  {data.timeline.map((event: any, i: number) => (
                    <div key={i} className="relative">
                      {/* Point */}
                      <div
                        className={`absolute -left-10 mt-0.5 w-4 h-4 rounded-full border-2 border-white shadow flex items-center justify-center text-[9px] ${
                          TIMELINE_COLORS[event.type] ?? "bg-gray-400"
                        }`}
                      />
                      <div className="card p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="text-base flex-shrink-0">
                              {event.icone}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-800 leading-snug">
                                {event.label}
                              </p>
                              {event.detail && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {event.detail}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                            {formatDate(event.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* ── Historiques détaillés ── */}
          {data.maintenance.historique.length > 0 && (
            <Section
              title="Détail des maintenances"
              icon={<Wrench size={18} />}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">
                        Date
                      </th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">
                        Intervention
                      </th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">
                        Type
                      </th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">
                        Fournisseur
                      </th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500">
                        Montant
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.maintenance.historique.map((m: any, i: number) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                          {formatDate(m.date)}
                        </td>
                        <td className="py-2 pr-4 font-medium text-gray-800">
                          {m.titre}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            {m.type_operation}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-500">
                          {m.fournisseur ?? "—"}
                        </td>
                        <td className="py-2 text-right font-semibold text-gray-800">
                          {formatCfa(m.montant_ttc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
