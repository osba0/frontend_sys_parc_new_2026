import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  RefreshCw,
  Car,
  User,
  FileText,
  Wrench,
  Shield,
  Clock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertesApi } from "@/api/finance.api";
import PageHeader from "@/components/shared/PageHeader";
import { CardLoading } from "@/components/shared/LoadingPage";
import { formatDate, formatEcheance } from "@/utils";
import toast from "react-hot-toast";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  vt_proche: {
    label: "Visite technique",
    icon: <Shield size={14} />,
    color: "text-blue-600",
  },
  vt_expiree: {
    label: "VT expirée",
    icon: <Shield size={14} />,
    color: "text-red-600",
  },
  assurance_proche: {
    label: "Assurance",
    icon: <Shield size={14} />,
    color: "text-orange-600",
  },
  assurance_expiree: {
    label: "Assurance expirée",
    icon: <Shield size={14} />,
    color: "text-red-600",
  },
  permis_proche: {
    label: "Permis chauffeur",
    icon: <User size={14} />,
    color: "text-yellow-600",
  },
  permis_expire: {
    label: "Permis expiré",
    icon: <User size={14} />,
    color: "text-red-600",
  },
  entretien_du: {
    label: "Entretien dû",
    icon: <Wrench size={14} />,
    color: "text-purple-600",
  },
  document_expire: {
    label: "Document expiré",
    icon: <FileText size={14} />,
    color: "text-red-600",
  },
  document_proche: {
    label: "Document bientôt",
    icon: <FileText size={14} />,
    color: "text-yellow-600",
  },
  document_manquant: {
    label: "Document manquant",
    icon: <FileText size={14} />,
    color: "text-red-600",
  },
  signalement_ouvert: {
    label: "Signalement ouvert",
    icon: <AlertTriangle size={14} />,
    color: "text-orange-600",
  },
};

const NIVEAU_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  danger: {
    label: "Critique",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  warning: {
    label: "Attention",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    dot: "bg-yellow-500",
  },
  info: {
    label: "Info",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
};

const STATUT_BADGE: Record<
  string,
  { label: string; bg: string; text: string; icon: string }
> = {
  active: {
    label: "Active",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: "🔴",
  },
  lue: { label: "Lue", bg: "bg-gray-100", text: "text-gray-600", icon: "👁" },
  traitee: {
    label: "Traitée",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "✅",
  },
  ignoree: {
    label: "Ignorée",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    icon: "🔕",
  },
};

function AlerteCard({
  alerte,
  onMarkRead,
}: {
  alerte: any;
  onMarkRead: (id: number) => void;
}) {
  const navigate = useNavigate();
  const niveau = NIVEAU_CONFIG[alerte.niveau] ?? NIVEAU_CONFIG.info;
  const typeConf = TYPE_CONFIG[alerte.type_alerte] ?? {
    label: alerte.type_alerte,
    icon: <Bell size={14} />,
    color: "text-gray-600",
  };
  const statut = (alerte.statut as string) ?? "active";
  const statutBadge = STATUT_BADGE[statut] ?? STATUT_BADGE.active;
  const estTraitee = statut === "traitee" || statut === "ignoree";
  const estLue = statut === "lue";

  const handleNavigate = () => {
    if (alerte.vehicule?.id) navigate(`/vehicules/${alerte.vehicule.id}`);
    else if (alerte.chauffeur?.id)
      navigate(`/chauffeurs/${alerte.chauffeur.id}`);
  };

  return (
    <div
      className={`flex gap-3 p-4 rounded-xl border transition-all ${
        estTraitee
          ? "bg-gray-50 border-gray-200 opacity-70"
          : estLue
            ? `${niveau.bg} ${niveau.border} opacity-80`
            : `${niveau.bg} ${niveau.border}`
      }`}
    >
      <div className="flex-shrink-0">
        <span
          className={`w-2.5 h-2.5 rounded-full block mt-1.5 ${niveau.dot}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className={`flex flex-wrap items-center gap-1.5 text-xs font-medium mb-0.5 ${typeConf.color}`}
            >
              {typeConf.icon}
              <span>{typeConf.label}</span>
              <span
                className={`badge text-xs ${niveau.bg} ${niveau.text} border ${niveau.border}`}
              >
                {niveau.label}
              </span>
              {statut !== "active" && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${statutBadge.bg} ${statutBadge.text}`}
                >
                  {statutBadge.icon} {statutBadge.label}
                </span>
              )}
            </div>
            <p className={`text-sm font-semibold ${niveau.text}`}>
              {alerte.titre}
            </p>
            {alerte.message && (
              <p className="text-xs text-gray-600 mt-0.5">{alerte.message}</p>
            )}
          </div>

          {statut === "active" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(alerte.id);
              }}
              className="btn-icon text-gray-400 hover:text-success flex-shrink-0"
              title="Marquer comme lue"
            >
              <CheckCheck size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-2">
          {alerte.vehicule && (
            <button
              onClick={handleNavigate}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors"
            >
              <Car size={11} />
              <span className="font-mono font-medium">
                {alerte.vehicule.immatriculation}
              </span>
            </button>
          )}
          {alerte.chauffeur && (
            <button
              onClick={handleNavigate}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors"
            >
              <User size={11} />
              <span>
                {alerte.chauffeur.prenom} {alerte.chauffeur.nom}
              </span>
            </button>
          )}
          {alerte.echeance && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} />
              {formatEcheance(alerte.echeance) ?? formatDate(alerte.echeance)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertesPage() {
  const qc = useQueryClient();
  const [niveau, setNiveau] = useState("");
  const [type, setType] = useState("");
  const [statut, setStatut] = useState("active");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["alertes-liste", { niveau, type, statut, page }],
    queryFn: () =>
      alertesApi
        .list({
          page,
          per_page: 25,
          statut: statut || undefined,
          niveau: niveau || undefined,
          type_alerte: type || undefined,
        } as any)
        .then((r) => r.data),
  });

  const markReadMut = useMutation({
    mutationFn: (id: number) => alertesApi.marquerLue(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alertes-liste"] });
      qc.invalidateQueries({ queryKey: ["alertes-actives"] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => alertesApi.marquerToutesLues(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alertes-liste"] });
      qc.invalidateQueries({ queryKey: ["alertes-actives"] });
      toast.success("Toutes les alertes marquées comme lues.");
    },
  });

  const alertes = (data?.data ?? []) as any[];
  const total = data?.meta?.total ?? 0;
  const nbDanger = alertes.filter((a: any) => a.niveau === "danger").length;
  const nbWarning = alertes.filter((a: any) => a.niveau === "warning").length;
  const nbInfo = alertes.filter((a: any) => a.niveau === "info").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alertes"
        subtitle={`${total} alerte(s)`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => refetch()} className="btn-secondary gap-2">
              <RefreshCw size={14} /> Actualiser
            </button>
            <button
              onClick={() => markAllMut.mutate()}
              disabled={markAllMut.isPending || alertes.length === 0}
              className="btn-secondary gap-2"
            >
              <CheckCheck size={14} /> Tout marquer lu
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Critiques",
            count: nbDanger,
            bg: "bg-red-50 border-red-200",
            text: "text-red-600",
            dot: "bg-red-500",
            val: "danger",
          },
          {
            label: "Attention",
            count: nbWarning,
            bg: "bg-yellow-50 border-yellow-200",
            text: "text-yellow-600",
            dot: "bg-yellow-500",
            val: "warning",
          },
          {
            label: "Info",
            count: nbInfo,
            bg: "bg-blue-50 border-blue-200",
            text: "text-blue-600",
            dot: "bg-blue-500",
            val: "info",
          },
        ].map(({ label, count, bg, text, dot, val }) => (
          <button
            key={val}
            onClick={() => {
              setNiveau(niveau === val ? "" : val);
              setPage(1);
            }}
            className={`card p-4 border text-center transition-all cursor-pointer ${bg} ${
              niveau === val
                ? "ring-2 ring-offset-1 ring-primary-400"
                : "hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
              <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${text}`}>{count}</div>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value);
            setPage(1);
          }}
          className="input h-8 py-0 text-sm w-32"
        >
          <option value="active">Actives</option>
          <option value="">Toutes</option>
          <option value="lue">Lues</option>
          <option value="traitee">Traitées</option>
          <option value="ignoree">Ignorées</option>
        </select>
        <select
          value={niveau}
          onChange={(e) => {
            setNiveau(e.target.value);
            setPage(1);
          }}
          className="input h-8 py-0 text-sm w-36"
        >
          <option value="">Tous niveaux</option>
          <option value="danger">🔴 Critique</option>
          <option value="warning">🟡 Attention</option>
          <option value="info">🔵 Info</option>
        </select>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="input h-8 py-0 text-sm w-48"
        >
          <option value="">Tous types</option>
          {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
            <option key={key} value={key}>
              {conf.label}
            </option>
          ))}
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4">
              <CardLoading rows={2} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-red-500 text-sm">Erreur de chargement.</p>
          <button onClick={() => refetch()} className="btn-secondary mt-3">
            Réessayer
          </button>
        </div>
      ) : alertes.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Aucune alerte</p>
          <p className="text-gray-400 text-sm mt-1">
            {statut === "active"
              ? "Toutes vos alertes ont été traitées. ✅"
              : "Aucune alerte pour ces critères."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertes.map((a: any) => (
            <AlerteCard
              key={a.id}
              alerte={a}
              onMarkRead={(id) => markReadMut.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.meta && data.meta.last_page > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-gray-400">
            Page {data.meta.current_page} / {data.meta.last_page} · {total}{" "}
            alertes
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary btn-sm"
            >
              ← Préc.
            </button>
            <button
              disabled={page >= data.meta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary btn-sm"
            >
              Suiv. →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
