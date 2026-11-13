import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditApi, type AuditLogEntry } from "@/api/audit.api";
import { useAgences } from "@/hooks";
import DataTable, { type Column } from "@/components/shared/DataTable";
import PageHeader from "@/components/shared/PageHeader";
import { formatDateTime } from "@/utils";
import { History, Plus, Pencil, Trash2, Info } from "lucide-react";

// ── Libellés FR ───────────────────────────────────────────────

const EVENT_LABELS: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  created: {
    label: "Création",
    icon: <Plus size={12} />,
    color: "badge-success",
  },
  updated: {
    label: "Modification",
    icon: <Pencil size={12} />,
    color: "badge-info",
  },
  deleted: {
    label: "Suppression",
    icon: <Trash2 size={12} />,
    color: "badge-danger",
  },
};

function EventBadge({ event }: { event: string }) {
  const cfg = EVENT_LABELS[event] ?? {
    label: event,
    icon: <Info size={12} />,
    color: "badge-gray",
  };
  return (
    <span className={`badge ${cfg.color} inline-flex items-center gap-1`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

const MODULE_COLORS: Record<string, string> = {
  vehicule: "bg-blue-50 text-blue-700",
  chauffeur: "bg-indigo-50 text-indigo-700",
  affectation: "bg-cyan-50 text-cyan-700",
  checklist: "bg-teal-50 text-teal-700",
  signalement: "bg-orange-50 text-orange-700",
  maintenance: "bg-red-50 text-red-700",
  carburant: "bg-purple-50 text-purple-700",
  pneumatique: "bg-gray-50 text-gray-700",
  document: "bg-yellow-50 text-yellow-700",
  bonCommande: "bg-emerald-50 text-emerald-700",
  fournisseur: "bg-pink-50 text-pink-700",
  agence: "bg-slate-50 text-slate-700",
  axeLivraison: "bg-lime-50 text-lime-700",
  utilisateur: "bg-violet-50 text-violet-700",
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [module, setModule] = useState("");
  const [event, setEvent] = useState("");
  const [agenceId, setAgenceId] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [search, setSearch] = useState("");

  const { data: agences = [] } = useAgences();

  const { data: modulesData } = useQuery({
    queryKey: ["audit-modules"],
    queryFn: () => auditApi.modules().then((r) => r.data.data),
    staleTime: Infinity,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "audit-logs",
      { page, userId, module, event, agenceId, dateDebut, dateFin, search },
    ],
    queryFn: () =>
      auditApi
        .list({
          page,
          per_page: 25,
          user_id: userId || undefined,
          module: module || undefined,
          event: event || undefined,
          agence_id: agenceId || undefined,
          date_debut: dateDebut || undefined,
          date_fin: dateFin || undefined,
          search: search || undefined,
        })
        .then((r) => r.data),
  });

  const scope = data?.scope;

  // Filtre utilisateur — uniquement pertinent si le scope le permet
  const { data: utilisateurs = [] } = useQuery({
    queryKey: ["audit-utilisateurs"],
    queryFn: () => auditApi.utilisateurs().then((r) => r.data.data),
    enabled: scope?.peut_filtrer_user === true,
    staleTime: 5 * 60 * 1000,
  });

  const columns: Column<AuditLogEntry>[] = [
    {
      key: "created_at",
      header: "Date",
      render: (l) => (
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {formatDateTime(l.created_at)}
        </span>
      ),
    },
    {
      key: "causer",
      header: "Utilisateur",
      render: (l) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {l.causer
              ? `${l.causer.prenom ?? ""} ${l.causer.name ?? ""}`.trim()
              : "Système"}
          </div>
          {l.causer?.email && (
            <div className="text-xs text-gray-400">{l.causer.email}</div>
          )}
        </div>
      ),
    },
    {
      key: "module",
      header: "Module",
      render: (l) => (
        <span
          className={`badge text-xs ${MODULE_COLORS[l.module ?? ""] ?? "bg-gray-50 text-gray-600"}`}
        >
          {modulesData?.find((m) => m.value === l.module)?.label ??
            l.module ??
            "Autre"}
        </span>
      ),
    },
    {
      key: "event",
      header: "Action",
      render: (l) => <EventBadge event={l.event} />,
    },
    {
      key: "description",
      header: "Description",
      render: (l) => (
        <span className="text-sm text-gray-700">{l.description}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal d'audit"
        subtitle={scope?.label ?? "Historique des actions du système"}
      />

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        total={data?.meta?.total}
        page={page}
        perPage={25}
        onPageChange={setPage}
        loading={isLoading}
        error={error ? "Erreur de chargement." : null}
        onRetry={refetch}
        rowKey={(l) => l.id}
        emptyTitle="Aucune action enregistrée"
        emptyDescription="Aucune entrée du journal ne correspond aux critères sélectionnés."
        searchable
        searchPlaceholder="Rechercher dans la description…"
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
        filters={
          <div className="flex flex-wrap gap-2">
            {/* Utilisateur — uniquement si le scope le permet */}
            {scope?.peut_filtrer_user && (
              <select
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setPage(1);
                }}
                className="input h-8 py-0 text-sm w-48"
              >
                <option value="">Tous les utilisateurs</option>
                {utilisateurs.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            )}

            {/* Module */}
            <select
              value={module}
              onChange={(e) => {
                setModule(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-40"
            >
              <option value="">Tous les modules</option>
              {(modulesData ?? []).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Type d'action */}
            <select
              value={event}
              onChange={(e) => {
                setEvent(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-36"
            >
              <option value="">Toutes actions</option>
              <option value="created">Création</option>
              <option value="updated">Modification</option>
              <option value="deleted">Suppression</option>
            </select>

            {/* Agence — uniquement si le scope est global */}
            {scope?.peut_filtrer_agence && (
              <select
                value={agenceId}
                onChange={(e) => {
                  setAgenceId(e.target.value);
                  setPage(1);
                }}
                className="input h-8 py-0 text-sm w-40"
              >
                <option value="">Toutes agences</option>
                {agences.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.nom}
                  </option>
                ))}
              </select>
            )}

            {/* Période */}
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => {
                setDateDebut(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-36"
              title="Date de début"
            />
            <input
              type="date"
              value={dateFin}
              onChange={(e) => {
                setDateFin(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-36"
              title="Date de fin"
            />
          </div>
        }
      />

      {/* Bandeau scope informatif */}
      {scope && scope.type !== "global" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-500">
          <History size={13} />
          {scope.type === "agence"
            ? "Vous consultez le journal d'audit de votre agence uniquement."
            : "Vous consultez uniquement les actions vous concernant (vos actions, votre véhicule affecté)."}
        </div>
      )}
    </div>
  );
}
