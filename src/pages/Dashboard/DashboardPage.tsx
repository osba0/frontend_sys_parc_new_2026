import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Car,
  Users,
  Wrench,
  Fuel,
  Bell,
  AlertTriangle,
  TrendingUp,
  ClipboardCheck,
  ShoppingCart,
  FileText,
  CircleDot,
  ArrowLeftRight,
  Calendar,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useDashboardStats,
  useDashboardAlertes,
  useKpiMensuel,
  useActiviteRecente,
} from "@/hooks";
import { authApi } from "@/api/auth.api";
import { vehiculesApi } from "@/api/vehicules.api";
import KpiCard from "@/components/shared/KpiCard";
import PageHeader from "@/components/shared/PageHeader";
import { CardLoading, ErrorState } from "@/components/shared/LoadingPage";
import { NiveauAlerteBadge } from "@/components/shared/StatutBadge";
import CommunicationBandeau from "@/components/shared/CommunicationBandeau";
import PlaqueSN from "@/components/shared/PlaqueSN";
import { useAuthStore } from "@/stores/authStore";
import {
  formatCfaCompact,
  formatDate,
  formatDateRelative,
  formatEcheance,
  getAlerteNiveauBg,
  CHART_COLORS,
} from "@/utils";
import type { DashboardStats, User } from "@/types";

// ─────────────────────────────────────────────────────────────
// Defaults & helpers
// ─────────────────────────────────────────────────────────────

const STATS_DEFAULT: DashboardStats = {
  periode: { mois: new Date().getMonth() + 1, annee: new Date().getFullYear() },
  vehicules: {
    total: 0,
    actifs: 0,
    en_panne: 0,
    en_maintenance: 0,
    hors_service: 0,
    vt_prochaine_30j: 0,
    assurance_prochaine_30j: 0,
    entretien_echu: 0,
  },
  maintenance: {
    depenses_mois: 0,
    nb_interventions: 0,
    en_attente_approbation: 0,
  },
  carburant: {
    depenses_mois: 0,
    litres_mois: 0,
    dotation_mois: 0,
    taux_conso: null,
  },
  pneus: { depenses_mois: 0, nb_operations: 0 },
  signalements: { total_ouverts: 0, critiques: 0, hauts: 0 },
  alertes: { danger: 0, warning: 0, info: 0, total: 0 },
  chauffeurs: { total: 0, permis_expirant_30j: 0 },
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: p.color }}
          />
          <span className="text-gray-600">{p.name} :</span>
          <span className="font-medium">{formatCfaCompact(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Blocs réutilisables
// ─────────────────────────────────────────────────────────────

function AlertesBlock({
  alertes,
  loading,
}: {
  alertes: any[] | undefined;
  loading: boolean;
}) {
  const navigate = useNavigate();

  // Mapping type_alerte → URL de destination avec le contexte pertinent
  const getAlerteLien = (a: any): string => {
    const vid = a.vehicule?.id;
    const cid = a.chauffeur?.id;
    switch (a.type_alerte) {
      case "vt_prochaine":
      case "vt_expiree":
        return vid
          ? `/vehicules/${vid}?tab=documents`
          : "/vehicules?filter[vt_prochaine]=1";
      case "assurance_prochaine":
      case "assurance_expiree":
        return vid
          ? `/vehicules/${vid}?tab=documents`
          : "/vehicules?filter[assurance_prochaine]=1";
      case "document_manquant":
      case "document_expire":
        return vid ? `/vehicules/${vid}?tab=documents` : "/vehicules";
      case "entretien_echu":
      case "entretien_prochain":
        return vid
          ? `/vehicules/${vid}?tab=maintenances`
          : "/vehicules?filter[entretien_echu]=1";
      case "permis_expirant":
      case "permis_expire":
        return cid ? `/chauffeurs/${cid}` : "/chauffeurs";
      case "signalement_non_traite":
        return "/signalements";
      case "maintenance_en_attente":
      case "bon_commande_en_attente":
        return "/maintenances";
      default:
        return "/alertes";
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title text-base">Alertes prioritaires</h3>
        <button
          onClick={() => navigate("/alertes")}
          className="text-xs text-primary-600 hover:underline"
        >
          Voir tout →
        </button>
      </div>
      {loading ? (
        <CardLoading rows={4} />
      ) : !alertes || alertes.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          ✓ Aucune alerte active
        </p>
      ) : (
        <div className="space-y-2">
          {alertes.slice(0, 6).map((a: any) => (
            <button
              key={a.id}
              onClick={() => navigate(getAlerteLien(a))}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-opacity hover:opacity-80 ${getAlerteNiveauBg(a.niveau)}`}
            >
              <NiveauAlerteBadge
                niveau={a.niveau}
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {a.titre}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {a.vehicule?.immatriculation ? (
                    <PlaqueSN
                      immatriculation={a.vehicule.immatriculation}
                      style={a.vehicule.style_plaque ?? "nouvelle"}
                      size="xs"
                    />
                  ) : a.chauffeur?.nom ? (
                    <span className="text-xs text-gray-500">
                      {a.chauffeur.nom}
                    </span>
                  ) : null}
                  {a.echeance && (
                    <span className="text-xs text-gray-400">
                      · {formatEcheance(a.echeance) ?? formatDate(a.echeance)}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-gray-400 text-xs flex-shrink-0">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiviteBlock({
  activite,
  loading,
}: {
  activite: any[] | undefined;
  loading: boolean;
}) {
  const TYPE_CONFIG: Record<
    string,
    { bg: string; icon: React.ReactNode; label: string }
  > = {
    maintenance: {
      bg: "bg-yellow-500",
      icon: <Wrench size={14} />,
      label: "Maintenance",
    },
    signalement: {
      bg: "bg-red-500",
      icon: <AlertTriangle size={14} />,
      label: "Signalement",
    },
    affectation: {
      bg: "bg-blue-500",
      icon: <ArrowLeftRight size={14} />,
      label: "Affectation",
    },
    checklist: {
      bg: "bg-teal-500",
      icon: <ClipboardCheck size={14} />,
      label: "Checklist",
    },
    carburant: {
      bg: "bg-purple-500",
      icon: <Fuel size={14} />,
      label: "Carburant",
    },
    pneumatique: {
      bg: "bg-gray-600",
      icon: <CircleDot size={14} />,
      label: "Pneumatique",
    },
    document: {
      bg: "bg-green-500",
      icon: <FileText size={14} />,
      label: "Document",
    },
  };

  return (
    <div className="card">
      <h3 className="section-title text-base mb-4">Activité récente</h3>
      {loading ? (
        <CardLoading rows={5} />
      ) : !activite || activite.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          Aucune activité récente
        </p>
      ) : (
        <div className="space-y-2">
          {activite.map((a: any, i: number) => {
            const cfg = TYPE_CONFIG[a.type] ?? {
              bg: "bg-gray-400",
              icon: <Car size={14} />,
              label: a.type,
            };
            return (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white ${cfg.bg}`}
                >
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {a.titre ?? "—"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {a.vehicule?.immatriculation ? (
                      <PlaqueSN
                        immatriculation={a.vehicule.immatriculation}
                        style={a.vehicule.style_plaque ?? "nouvelle"}
                        size="xs"
                      />
                    ) : a.sous_titre ? (
                      <span className="text-xs text-gray-500 truncate">
                        {a.sous_titre}
                      </span>
                    ) : null}
                    {a.montant != null && (
                      <span className="text-xs text-gray-400">
                        · {formatCfaCompact(a.montant)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {formatDateRelative(a.date)}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white ${cfg.bg}`}
                  >
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboards par profil
// ─────────────────────────────────────────────────────────────

function DashboardDirecteur({
  stats,
  alertes,
  kpi,
  activite,
  annee,
  loading,
}: any) {
  const navigate = useNavigate();
  const pieData = [
    {
      name: "Actifs",
      value: stats.vehicules.actifs,
      color: CHART_COLORS.entretien,
    },
    { name: "En panne", value: stats.vehicules.en_panne, color: "#E74C3C" },
    {
      name: "Maintenance",
      value: stats.vehicules.en_maintenance,
      color: "#F39C12",
    },
    {
      name: "Hors service",
      value: stats.vehicules.hors_service,
      color: "#95A5A6",
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPIs globaux */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <KpiCard
          title="Total véhicules"
          value={stats.vehicules.total}
          subtitle={`${stats.vehicules.actifs} actifs`}
          icon={<Car size={22} />}
          color="blue"
          onClick={() => navigate("/vehicules")}
        />
        <KpiCard
          title="Maintenance ce mois"
          value={formatCfaCompact(stats.maintenance.depenses_mois)}
          subtitle={`${stats.maintenance.nb_interventions} intervention(s)`}
          icon={<Wrench size={22} />}
          color="yellow"
          onClick={() => navigate("/maintenances")}
        />
        <KpiCard
          title="Carburant ce mois"
          value={formatCfaCompact(stats.carburant.depenses_mois)}
          subtitle={`${stats.carburant.taux_conso ?? "—"}% dotation`}
          icon={<Fuel size={22} />}
          color="purple"
          onClick={() => navigate("/carburant")}
        />
        <KpiCard
          title="Pneumatiques ce mois"
          value={formatCfaCompact(stats.pneus.depenses_mois)}
          subtitle={`${stats.pneus.nb_operations} opération(s)`}
          icon={<CircleDot size={22} />}
          color="gray"
          onClick={() => navigate("/pneumatiques")}
        />
        <KpiCard
          title="Alertes"
          value={stats.alertes.total}
          subtitle={`${stats.alertes.danger} critiques`}
          icon={<Bell size={22} />}
          color={stats.alertes.danger > 0 ? "red" : "green"}
          onClick={() => navigate("/alertes")}
        />
        <KpiCard
          title="Signalements ouverts"
          value={stats.signalements.total_ouverts}
          subtitle={`${stats.signalements.critiques} critique(s)`}
          icon={<AlertTriangle size={22} />}
          color={stats.signalements.critiques > 0 ? "red" : "blue"}
          onClick={() => navigate("/signalements")}
        />
        <KpiCard
          title="Validations en attente"
          value={stats.maintenance.en_attente_approbation}
          subtitle="Maintenances à approuver"
          icon={<TrendingUp size={22} />}
          color={stats.maintenance.en_attente_approbation > 0 ? "red" : "green"}
          onClick={() =>
            navigate("/maintenances?filter[necessite_approbation]=1")
          }
        />
        <KpiCard
          title="VT à renouveler"
          value={stats.vehicules.vt_prochaine_30j}
          subtitle="Expire dans 30 jours"
          icon={<ClipboardCheck size={22} />}
          color={stats.vehicules.vt_prochaine_30j > 0 ? "red" : "green"}
          onClick={() => navigate("/vehicules?filter[vt_prochaine]=1")}
        />
        <KpiCard
          title="Chauffeurs actifs"
          value={stats.chauffeurs.total}
          subtitle={`${stats.chauffeurs.permis_expirant_30j} permis expirant`}
          icon={<Users size={22} />}
          color={stats.chauffeurs.permis_expirant_30j > 0 ? "yellow" : "blue"}
          onClick={() => navigate("/chauffeurs")}
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card">
          <h3 className="section-title text-base mb-4">
            Dépenses mensuelles {annee}
          </h3>
          {loading.kpi ? (
            <CardLoading rows={6} />
          ) : kpi?.series?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart
                data={kpi.series}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={CHART_COLORS.maintenance}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_COLORS.maintenance}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={CHART_COLORS.carburant}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_COLORS.carburant}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={CHART_COLORS.pneus}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_COLORS.pneus}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => formatCfaCompact(v)}
                  tick={{ fontSize: 10 }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="maintenance"
                  name="Maintenance"
                  stroke={CHART_COLORS.maintenance}
                  fill="url(#gM)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="carburant"
                  name="Carburant"
                  stroke={CHART_COLORS.carburant}
                  fill="url(#gC)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="pneumatiques_module"
                  name="Pneumatiques"
                  stroke={CHART_COLORS.pneus}
                  fill="url(#gP)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
              Aucune donnée
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="section-title text-base mb-4">Flotte par statut</h3>
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {pieData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-1.5 mt-2">
                {pieData.map((d) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: d.color }}
                      />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
              Aucun véhicule
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AlertesBlock alertes={alertes} loading={loading.alertes} />
        <ActiviteBlock activite={activite} loading={loading.activite} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function DashboardRespParc({ stats, alertes, activite, loading }: any) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Véhicules actifs"
          value={stats.vehicules.actifs}
          subtitle={`${stats.vehicules.en_panne} en panne · ${stats.vehicules.en_maintenance} en maint.`}
          icon={<Car size={22} />}
          color="blue"
          onClick={() => navigate("/vehicules")}
        />
        <KpiCard
          title="Maintenance ce mois"
          value={formatCfaCompact(stats.maintenance.depenses_mois)}
          subtitle={`${stats.maintenance.nb_interventions} intervention(s)`}
          icon={<Wrench size={22} />}
          color="yellow"
          onClick={() => navigate("/maintenances")}
        />
        <KpiCard
          title="VT prochaines"
          value={stats.vehicules.vt_prochaine_30j}
          subtitle="Dans 30 jours"
          icon={<ClipboardCheck size={22} />}
          color={stats.vehicules.vt_prochaine_30j > 0 ? "red" : "green"}
          onClick={() => navigate("/vehicules?filter[vt_prochaine]=1")}
        />
        <KpiCard
          title="Entretiens échus"
          value={stats.vehicules.entretien_echu}
          subtitle="Km dépassé"
          icon={<TrendingUp size={22} />}
          color={stats.vehicules.entretien_echu > 0 ? "red" : "green"}
          onClick={() => navigate("/vehicules?filter[entretien_echu]=1")}
        />
        <KpiCard
          title="Signalements ouverts"
          value={stats.signalements.total_ouverts}
          subtitle={`${stats.signalements.critiques} critique(s)`}
          icon={<AlertTriangle size={22} />}
          color={stats.signalements.critiques > 0 ? "red" : "blue"}
          onClick={() => navigate("/signalements")}
        />
        <KpiCard
          title="En attente approbation"
          value={stats.maintenance.en_attente_approbation}
          subtitle="Maintenances à valider"
          icon={<Wrench size={22} />}
          color={
            stats.maintenance.en_attente_approbation > 0 ? "yellow" : "green"
          }
          onClick={() =>
            navigate("/maintenances?filter[necessite_approbation]=1")
          }
        />
        <KpiCard
          title="Alertes actives"
          value={stats.alertes.total}
          subtitle={`${stats.alertes.danger} critiques`}
          icon={<Bell size={22} />}
          color={stats.alertes.danger > 0 ? "red" : "green"}
          onClick={() => navigate("/alertes")}
        />
        <KpiCard
          title="Assurances prochaines"
          value={stats.vehicules.assurance_prochaine_30j ?? 0}
          subtitle="Expiration < 30 jours"
          icon={<FileText size={22} />}
          color={
            (stats.vehicules.assurance_prochaine_30j ?? 0) > 0 ? "red" : "green"
          }
          onClick={() => navigate("/vehicules?filter[assurance_prochaine]=1")}
        />
        <KpiCard
          title="Pneumatiques ce mois"
          value={formatCfaCompact(stats.pneus.depenses_mois)}
          subtitle={`${stats.pneus.nb_operations} opération(s)`}
          icon={<CircleDot size={22} />}
          color="gray"
          onClick={() => navigate("/pneumatiques")}
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AlertesBlock alertes={alertes} loading={loading.alertes} />
        <ActiviteBlock activite={activite} loading={loading.activite} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function DashboardComptable({ stats, loading }: any) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Maintenance ce mois"
          value={formatCfaCompact(stats.maintenance.depenses_mois)}
          subtitle={`${stats.maintenance.nb_interventions} intervention(s)`}
          icon={<Wrench size={22} />}
          color="yellow"
          onClick={() => navigate("/maintenances")}
        />
        <KpiCard
          title="Carburant ce mois"
          value={formatCfaCompact(stats.carburant.depenses_mois)}
          subtitle={`${stats.carburant.litres_mois} L · ${stats.carburant.taux_conso ?? "—"}% dotation`}
          icon={<Fuel size={22} />}
          color="purple"
          onClick={() => navigate("/carburant")}
        />
        <KpiCard
          title="Pneumatiques ce mois"
          value={formatCfaCompact(stats.pneus.depenses_mois)}
          subtitle={`${stats.pneus.nb_operations} opération(s)`}
          icon={<CircleDot size={22} />}
          color="gray"
          onClick={() => navigate("/pneumatiques")}
        />
        <KpiCard
          title="Dotation carburant"
          value={formatCfaCompact(stats.carburant.dotation_mois)}
          subtitle="Allouée ce mois"
          icon={<Fuel size={22} />}
          color="blue"
          onClick={() => navigate("/carburant/dotations")}
        />
      </div>
      <div className="card p-6">
        <h3 className="section-title">Accès rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Bons de commande",
              path: "/bons-commande",
              icon: <ShoppingCart size={20} />,
              color: "bg-blue-100 text-blue-700",
            },
            {
              label: "Rapport maintenance",
              path: "/rapports/maintenance",
              icon: <Wrench size={20} />,
              color: "bg-yellow-100 text-yellow-700",
            },
            {
              label: "Rapport carburant",
              path: "/rapports/carburant",
              icon: <Fuel size={20} />,
              color: "bg-purple-100 text-purple-700",
            },
            {
              label: "TCO Parc",
              path: "/rapports/tco",
              icon: <TrendingUp size={20} />,
              color: "bg-green-100 text-green-700",
            },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}
              >
                {item.icon}
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function DashboardChauffeur({ user }: { user: User }) {
  const navigate = useNavigate();

  const c = user.chauffeur;
  const permisAlerte =
    c?.statut_permis === "critique" || c?.statut_permis === "expire";
  const permisWarning = c?.statut_permis === "warning";

  // Support multi-véhicules : utiliser vehicules_actifs si disponible,
  // sinon repli sur vehicule_actuel (rétrocompatibilité)
  const vehiculesActifs = c?.vehicules_actifs?.length
    ? c.vehicules_actifs
    : c?.vehicule_actuel
      ? [{ ...c.vehicule_actuel, type_carburant: null, agence_id: null }]
      : [];

  // Charger les infos VT/assurance pour TOUS les véhicules affectés
  const vehiculeIds = vehiculesActifs.map((v) => v.vehicule_id);
  const { data: vehiculesData = [] } = useQuery({
    queryKey: ["dashboard-vehicules-chauffeur", vehiculeIds],
    queryFn: () =>
      Promise.all(
        vehiculeIds.map((id) => vehiculesApi.get(id).then((r) => r.data.data)),
      ),
    enabled: vehiculeIds.length > 0,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-5">
      {/* ── Bienvenue ── */}
      <div className="card p-5 bg-primary-50 border-primary-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 select-none">
            {user.prenom?.[0]}
            {user.name?.[0]}
          </div>
          <div>
            <p className="text-xs text-primary-400 uppercase tracking-wide">
              Bonjour
            </p>
            <h2 className="text-lg font-bold text-primary-700">
              {user.prenom} {user.name}
            </h2>
            <p className="text-sm text-primary-500">
              {user.fonction ?? "Chauffeur"} · {user.agence?.nom ?? "—"}
            </p>
          </div>
        </div>
        {c?.matricule_interne && (
          <div className="mt-3 pt-3 border-t border-primary-200">
            <span className="text-xs text-primary-400">Matricule : </span>
            <span className="text-xs font-mono font-semibold text-primary-600">
              {c.matricule_interne}
            </span>
          </div>
        )}
      </div>

      {/* ── Véhicules affectés (1 ou plusieurs) ── */}
      {vehiculesActifs.length === 0 ? (
        <div className="card p-5 border-dashed border-gray-200 bg-gray-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
            <Car size={20} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">
              Aucun véhicule affecté
            </p>
            <p className="text-xs text-gray-400">
              Contactez votre responsable de parc.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`grid gap-4 ${vehiculesActifs.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}
          >
            {vehiculesActifs.map((v) => {
              const vData = vehiculesData.find(
                (vd) => vd?.id === v.vehicule_id,
              );
              const vtAlerte =
                vData &&
                vData.jours_avant_vt !== null &&
                vData.jours_avant_vt <= 30;
              const assurAlerte =
                vData &&
                vData.jours_avant_assurance !== null &&
                vData.jours_avant_assurance <= 30;
              const hasAlerte = vtAlerte || assurAlerte;

              return (
                <div
                  key={v.vehicule_id}
                  className={`card p-5 cursor-pointer hover:shadow-md transition-shadow ${
                    hasAlerte
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-green-200 bg-green-50"
                  }`}
                  onClick={() => navigate(`/vehicules/${v.vehicule_id}`)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        hasAlerte ? "bg-yellow-400" : "bg-green-500"
                      }`}
                    >
                      <Car size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        Véhicule affecté
                      </p>
                      <p className="text-xl font-bold text-primary-700 font-mono">
                        {v.immatriculation}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{v.marque_modele}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Affecté depuis{" "}
                    {v.depuis
                      ? new Date(v.depuis).toLocaleDateString("fr-SN")
                      : "—"}
                  </p>
                  {/* Alertes inline sur la carte */}
                  {vtAlerte && (
                    <div className="mt-2 text-xs text-yellow-700 font-medium">
                      ⚠ VT :{" "}
                      {(vData!.jours_avant_vt ?? 0) <= 0
                        ? "Expirée"
                        : `Dans ${vData!.jours_avant_vt} jours`}
                    </div>
                  )}
                  {assurAlerte && (
                    <div className="mt-1 text-xs text-yellow-700 font-medium">
                      ⚠ Assurance :{" "}
                      {(vData!.jours_avant_assurance ?? 0) <= 0
                        ? "Expirée"
                        : `Dans ${vData!.jours_avant_assurance} jours`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Alerte permis ── */}
      {(permisAlerte || permisWarning) && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            permisAlerte
              ? "bg-red-50 border-red-200"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <AlertTriangle
            size={18}
            className={permisAlerte ? "text-red-500" : "text-yellow-500"}
          />
          <div>
            <p
              className={`text-sm font-semibold ${permisAlerte ? "text-red-700" : "text-yellow-700"}`}
            >
              {c?.statut_permis === "expire"
                ? "⚠ Votre permis de conduire a expiré"
                : `⚠ Votre permis expire dans ${c?.jours_avant_expiration_permis} jours`}
            </p>
            <p
              className={`text-xs mt-0.5 ${permisAlerte ? "text-red-600" : "text-yellow-600"}`}
            >
              Contactez votre responsable pour le renouvellement.
            </p>
          </div>
        </div>
      )}

      {/* ── Actions rapides ── */}
      <div className="card p-5">
        <h3 className="section-title">Actions rapides</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Signaler une panne",
              path: "/signalements/nouveau",
              icon: <AlertTriangle size={22} />,
              color: "bg-red-100 text-red-700",
              desc: "Déclarer un défaut ou anomalie",
              badge: null,
            },
            {
              label: "Nouvelle checklist",
              path: "/checklists",
              icon: <ClipboardCheck size={22} />,
              color: "bg-blue-100 text-blue-700",
              desc: "Effectuer un contrôle véhicule",
              badge: null,
            },
            {
              label: "Mes signalements",
              path: "/signalements",
              icon: <Bell size={22} />,
              color: "bg-orange-100 text-orange-700",
              desc: "Suivre mes déclarations",
              badge: null,
            },
            {
              label: "Mes affectations",
              path: "/affectations",
              icon: <Car size={22} />,
              color: "bg-green-100 text-green-700",
              desc: "Historique de mes missions",
              badge: null,
            },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color} group-hover:scale-105 transition-transform`}
              >
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-gray-900">
                  {item.label}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {item.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Infos pratiques ── */}
      <div className="card p-5">
        <h3 className="section-title">Informations</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Email", user.email],
            ["Tél.", user.telephone ?? "—"],
            ["Agence", user.agence?.nom ?? "—"],
            [
              "Permis",
              c?.statut_permis
                ? c.statut_permis.charAt(0).toUpperCase() +
                  c.statut_permis.slice(1)
                : "—",
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"
            >
              <dt className="text-gray-400">{label}</dt>
              <dd className="font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page principale — router par rôle
// ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { role, user, hasRole, setUser } = useAuthStore();

  // Filtre période dashboard
  const maintenant = new Date();
  const [moisFiltre, setMoisFiltre] = useState(maintenant.getMonth() + 1);
  const [anneeFiltre, setAnneeFiltre] = useState(maintenant.getFullYear());

  const estPeriodeCourante =
    moisFiltre === maintenant.getMonth() + 1 &&
    anneeFiltre === maintenant.getFullYear();

  // Pour le chauffeur : rafraîchir les données user au montage
  useEffect(() => {
    if (role === "chauffeur") {
      authApi
        .me()
        .then((r) => setUser(r.data.data))
        .catch(() => {});
    }
  }, [role, setUser]);

  const {
    data: rawStats,
    isLoading: l1,
    error: e1,
    refetch: r1,
  } = useDashboardStats(moisFiltre, anneeFiltre);
  const { data: alertes, isLoading: l2 } = useDashboardAlertes();
  const { data: kpi, isLoading: l3 } = useKpiMensuel(anneeFiltre);
  const { data: activite, isLoading: l4 } = useActiviteRecente(8);

  const stats: DashboardStats = rawStats
    ? {
        ...STATS_DEFAULT,
        ...rawStats,
        vehicules: { ...STATS_DEFAULT.vehicules, ...rawStats.vehicules },
        maintenance: { ...STATS_DEFAULT.maintenance, ...rawStats.maintenance },
        carburant: { ...STATS_DEFAULT.carburant, ...rawStats.carburant },
        pneus: { ...STATS_DEFAULT.pneus, ...rawStats.pneus },
        signalements: {
          ...STATS_DEFAULT.signalements,
          ...rawStats.signalements,
        },
        alertes: { ...STATS_DEFAULT.alertes, ...rawStats.alertes },
        chauffeurs: { ...STATS_DEFAULT.chauffeurs, ...rawStats.chauffeurs },
      }
    : STATS_DEFAULT;

  const loading = { kpi: l3, alertes: l2, activite: l4 };

  // Titre adapté au rôle
  const subtitles: Partial<Record<string, string>> = {
    super_admin: "Vue globale · Administration",
    directeur: "Vue globale · Pilotage",
    resp_parc: "Gestion opérationnelle du parc",
    resp_agence: "Tableau de bord agence",
    comptable: "Suivi financier",
    chauffeur: "Espace chauffeur",
    attributaire: "Espace attributaire",
  };

  const MOIS_LABELS = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];
  const ANNEES = Array.from(
    { length: 5 },
    (_, i) => maintenant.getFullYear() - i,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle={subtitles[role ?? ""] ?? ""}
        actions={
          !hasRole("chauffeur", "attributaire") ? (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Calendar size={14} className="text-primary-500 flex-shrink-0" />
              <select
                value={moisFiltre}
                onChange={(e) => setMoisFiltre(Number(e.target.value))}
                className="input h-8 py-0 text-sm w-32"
              >
                {MOIS_LABELS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={anneeFiltre}
                onChange={(e) => setAnneeFiltre(Number(e.target.value))}
                className="input h-8 py-0 text-sm w-20"
              >
                {ANNEES.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {!estPeriodeCourante && (
                <button
                  onClick={() => {
                    setMoisFiltre(maintenant.getMonth() + 1);
                    setAnneeFiltre(maintenant.getFullYear());
                  }}
                  className="text-xs text-primary-600 hover:underline whitespace-nowrap"
                >
                  ↩ Mois courant
                </button>
              )}
              {!estPeriodeCourante && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                  📅 {MOIS_LABELS[moisFiltre - 1]} {anneeFiltre}
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Annonces & notes de service actives */}
      <CommunicationBandeau />

      {/* Erreur stats globales */}
      {e1 && (
        <div className="card p-6">
          <ErrorState
            message="Impossible de charger les indicateurs."
            onRetry={r1}
          />
        </div>
      )}

      {/* Skeleton au premier chargement */}
      {l1 && !rawStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                  <div className="h-6 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dashboard selon le rôle */}
      {!l1 && (
        <>
          {/* Super Admin et Directeur → vue complète */}
          {hasRole("super_admin", "directeur") && (
            <DashboardDirecteur
              stats={stats}
              alertes={alertes}
              kpi={kpi}
              activite={activite}
              annee={anneeFiltre}
              loading={loading}
            />
          )}

          {/* Resp. Parc et Resp. Agence → vue opérationnelle */}
          {hasRole("resp_parc", "resp_agence") && (
            <DashboardRespParc
              stats={stats}
              alertes={alertes}
              activite={activite}
              loading={loading}
            />
          )}

          {/* Comptable → vue financière */}
          {hasRole("comptable") && (
            <DashboardComptable stats={stats} loading={loading} />
          )}

          {/* Chauffeur et Attributaire → vue terrain simplifiée */}
          {hasRole("chauffeur", "attributaire") && user && (
            <DashboardChauffeur user={user} />
          )}
        </>
      )}
    </div>
  );
}
