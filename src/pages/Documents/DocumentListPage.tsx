import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Plus,
  Download,
  RefreshCw,
  FileText,
  CheckCircle,
  Clock,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "@/api/finance.api";
import { vehiculesApi } from "@/api/vehicules.api";
import { agencesApi } from "@/api/finance.api";
import DataTable, { type Column } from "@/components/shared/DataTable";
import PageHeader from "@/components/shared/PageHeader";
import { StatutDocumentBadge } from "@/components/shared/StatutBadge";
import NewBadge from "@/components/shared/NewBadge";
import { CardLoading, LoadingSpinner } from "@/components/shared/LoadingPage";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, getTypeDocumentLabel } from "@/utils";
import toast from "react-hot-toast";

const TYPES_DOCUMENT = [
  { value: "carte_grise", label: "Carte grise", icon: "📋" },
  { value: "assurance", label: "Assurance", icon: "🛡" },
  { value: "visite_technique", label: "Visite technique", icon: "🔍" },
  {
    value: "autorisation_circulation",
    label: "Autorisation circ.",
    icon: "✅",
  },
  { value: "carte_carburant", label: "Carte carburant", icon: "⛽" },
  { value: "autre", label: "Autre", icon: "📄" },
];

// ─────────────────────────────────────────────────────────────
// Modal création / renouvellement document
// ─────────────────────────────────────────────────────────────

function DocumentModal({
  vehiculeIdDefault,
  documentRenouv,
  onClose,
}: {
  vehiculeIdDefault?: number;
  documentRenouv?: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { user, hasRole } = useAuthStore();
  const isRenouv = !!documentRenouv;

  // Seul resp_agence est scopé à son agence — resp_parc voit toutes les agences
  const agenceScopee = hasRole("resp_agence")
    ? (user?.agence_id ?? null)
    : null;

  const [agenceId, setAgenceId] = useState(
    String(agenceScopee ?? documentRenouv?.agence_id ?? user?.agence_id ?? ""),
  );
  const [vehiculeId, setVehiculeId] = useState(
    String(vehiculeIdDefault ?? documentRenouv?.vehicule_id ?? ""),
  );
  const [typeDoc, setTypeDoc] = useState(
    documentRenouv?.type_document ?? "assurance",
  );
  const [intitule, setIntitule] = useState(documentRenouv?.intitule ?? "");
  const [numero, setNumero] = useState("");
  const [emission, setEmission] = useState("");
  const [expiration, setExpiration] = useState("");
  const [organisme, setOrganisme] = useState("");
  const [notes, setNotes] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);

  const { data: agences = [] } = useQuery({
    queryKey: ["agences-select"],
    queryFn: () => agencesApi.list({ per_page: 100 }).then((r) => r.data.data),
    staleTime: Infinity,
  });
  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules-doc-select", agenceId],
    queryFn: () =>
      vehiculesApi
        .list({
          per_page: 200,
          "filter[agence_id]": agenceId || undefined,
        })
        .then((r) => r.data.data),
    enabled: !!agenceId,
  });

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("vehicule_id", vehiculeId);
    fd.append("type_document", typeDoc);
    if (intitule) fd.append("intitule", intitule);
    if (numero) fd.append("numero", numero);
    if (emission) fd.append("date_emission", emission);
    if (expiration) fd.append("date_expiration", expiration);
    if (organisme) fd.append("organisme_emetteur", organisme);
    if (notes) fd.append("notes", notes);
    if (fichier) fd.append("fichier", fichier, fichier.name);
    return fd;
  };

  const mut = useMutation({
    mutationFn: () =>
      isRenouv
        ? documentsApi.renouveler(documentRenouv.id, buildFormData())
        : documentsApi.create(buildFormData()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents-global"] });
      qc.invalidateQueries({ queryKey: ["docs-alertes"] });
      qc.invalidateQueries({ queryKey: ["vehicule", parseInt(vehiculeId)] });
      toast.success(isRenouv ? "Document renouvelé." : "Document créé.");
      onClose();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculeId) {
      toast.error("Véhicule obligatoire.");
      return;
    }
    mut.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh]">
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <FileText size={18} />
              {isRenouv
                ? `Renouveler — ${getTypeDocumentLabel(documentRenouv.type_document)}`
                : "Nouveau document"}
            </h3>
            {isRenouv && (
              <p className="text-primary-200 text-xs mt-0.5">
                {documentRenouv.vehicule?.immatriculation} · Expire le{" "}
                {formatDate(documentRenouv.date_expiration)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-primary-200 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <form
          id="doc-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-4"
        >
          {/* Localisation */}
          {!isRenouv && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Agence</label>
                <select
                  value={agenceId}
                  onChange={(e) => {
                    setAgenceId(e.target.value);
                    setVehiculeId("");
                  }}
                  className="input"
                  disabled={!!agenceScopee}
                >
                  <option value="">-- Toutes --</option>
                  {agences.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.nom}
                    </option>
                  ))}
                </select>
                {agenceScopee && (
                  <p className="text-xs text-gray-400 mt-1">
                    Scopée à votre agence.
                  </p>
                )}
              </div>
              <div>
                <label className="label">Véhicule *</label>
                <select
                  value={vehiculeId}
                  onChange={(e) => setVehiculeId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">-- Sélectionner --</option>
                  {(vehicules as any[]).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.immatriculation} — {v.marque}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Type de document */}
          {!isRenouv && (
            <div>
              <label className="label">Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES_DOCUMENT.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTypeDoc(t.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                      typeDoc === t.value
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Intitulé + Numéro */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Intitulé</label>
              <input
                value={intitule}
                onChange={(e) => setIntitule(e.target.value)}
                className="input"
                placeholder="ex : Assurance NSIA 2025"
              />
            </div>
            <div>
              <label className="label">N° de référence</label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="input"
                placeholder="ex : ASS-2025-001"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date d'émission</label>
              <input
                type="date"
                value={emission}
                onChange={(e) => setEmission(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Date d'expiration</label>
              <input
                type="date"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Organisme */}
          <div>
            <label className="label">Organisme émetteur</label>
            <input
              value={organisme}
              onChange={(e) => setOrganisme(e.target.value)}
              className="input"
              placeholder="ex : NSIA Assurances, Centre de visite technique Dakar…"
            />
          </div>

          {/* Fichier */}
          <div>
            <label className="label">
              Fichier
              <span className="text-gray-400 font-normal ml-1">
                (PDF ou image, max 10 Mo)
              </span>
            </label>
            <div
              onClick={() => document.getElementById("doc-file-input")?.click()}
              className={`border-2 border-dashed rounded-xl p-4 cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-all text-center ${
                fichier ? "border-primary-400 bg-primary-50" : "border-gray-200"
              }`}
            >
              {fichier ? (
                <div className="flex items-center justify-center gap-2 text-primary-700">
                  <FileText size={18} />
                  <span className="text-sm font-medium truncate">
                    {fichier.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFichier(null);
                    }}
                  >
                    <X size={14} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ) : (
                <div>
                  <Download size={18} className="mx-auto text-gray-300 mb-1" />
                  <p className="text-sm text-gray-500">
                    Cliquer pour ajouter un fichier
                  </p>
                  <p className="text-xs text-gray-400">PDF · JPG · PNG</p>
                </div>
              )}
            </div>
            <input
              id="doc-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Informations complémentaires…"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            type="submit"
            form="doc-form"
            disabled={mut.isPending}
            className="btn-primary gap-2"
          >
            {mut.isPending ? (
              <>
                <LoadingSpinner size="sm" /> Enregistrement…
              </>
            ) : isRenouv ? (
              <>
                <RefreshCw size={14} /> Renouveler
              </>
            ) : (
              <>
                <Plus size={14} /> Créer le document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────

export default function DocumentListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const peutCreer = hasRole(
    "super_admin",
    "directeur",
    "resp_parc",
    "resp_agence",
  );
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [statut, setStatut] = useState("");
  const [agenceId, setAgenceId] = useState("");
  const [vehiculeId, setVehiculeId] = useState("");
  const [alertMode, setAlertMode] = useState(false);
  const [modal, setModal] = useState(false);
  const [renouvDoc, setRenouvDoc] = useState<any>(null);

  const { data: agences = [] } = useQuery({
    queryKey: ["agences-select"],
    queryFn: () => agencesApi.list({ per_page: 100 }).then((r) => r.data.data),
    staleTime: Infinity,
  });

  // Véhicules filtrés par agence sélectionnée
  const { data: vehiculesFiltres = [], isFetching: loadingVehicules } =
    useQuery({
      queryKey: ["vehicules-doc-filter", agenceId],
      queryFn: () =>
        vehiculesApi
          .list({
            per_page: 200,
            "filter[agence_id]": agenceId || undefined,
          })
          .then((r) => r.data.data as any[]),
      staleTime: 60_000,
    });

  // Alertes — documents expirant dans 60 jours (pour les KPIs)
  const { data: alertes } = useQuery({
    queryKey: ["docs-alertes"],
    queryFn: () =>
      documentsApi.expirationProchaine({ jours: 60 }).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  // Backend retourne { expires, critiques, warnings, attention, total }
  const nbExpires = (alertes as any)?.expires?.length ?? 0;
  const nbCritiques = (alertes as any)?.critiques?.length ?? 0;
  const nbWarning =
    ((alertes as any)?.warnings?.length ?? 0) +
    ((alertes as any)?.attention?.length ?? 0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "documents-global",
      { page, type, statut, agenceId, vehiculeId, alertMode },
    ],
    queryFn: () => {
      if (alertMode) {
        return documentsApi.expirationProchaine({ jours: 30 }).then((r) => {
          const d = r.data.data as any;
          const all = [
            ...(d?.expires ?? []),
            ...(d?.critiques ?? []),
            ...(d?.warnings ?? []),
          ];
          return {
            data: all,
            meta: {
              total: all.length,
              per_page: 100,
              current_page: 1,
              last_page: 1,
            },
          };
        });
      }
      return documentsApi
        .list({
          page,
          per_page: 25,
          include: "vehicule",
          sort: "date_expiration",
          "filter[type_document]": type || undefined,
          "filter[statut]": statut || undefined,
          "filter[agence_id]": agenceId || undefined,
          "filter[vehicule_id]": vehiculeId || undefined,
        })
        .then((r) => r.data);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => documentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents-global"] });
      qc.invalidateQueries({ queryKey: ["docs-alertes"] });
      toast.success("Document supprimé.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const columns: Column<any>[] = [
    {
      key: "type_document",
      header: "Type",
      render: (d) => (
        <div className="flex items-center gap-2">
          <span className="text-base">
            {TYPES_DOCUMENT.find((t) => t.value === d.type_document)?.icon ??
              "📄"}
          </span>
          <span className="font-medium text-sm">
            {getTypeDocumentLabel(d.type_document)}
          </span>
          <NewBadge createdAt={d.created_at} />
        </div>
      ),
    },
    {
      key: "vehicule",
      header: "Véhicule",
      render: (d) => (
        <span
          className="font-mono text-primary-700 font-semibold text-sm cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/vehicules/${d.vehicule_id}`);
          }}
        >
          {d.vehicule?.immatriculation ?? "—"}
        </span>
      ),
    },
    {
      key: "numero",
      header: "Référence",
      render: (d) => (
        <span className="text-sm text-gray-600">
          {d.numero ?? d.intitule ?? "—"}
        </span>
      ),
    },
    {
      key: "organisme_emetteur",
      header: "Organisme",
      render: (d) => (
        <span className="text-sm">{d.organisme_emetteur ?? "—"}</span>
      ),
    },
    {
      key: "date_expiration",
      header: "Expiration",
      render: (d) =>
        d.date_expiration ? (
          <span
            className={`text-sm font-medium ${
              d.statut_calcule === "expire"
                ? "text-red-600"
                : d.statut_calcule === "critique"
                  ? "text-orange-600"
                  : d.statut_calcule === "warning"
                    ? "text-yellow-600"
                    : "text-gray-700"
            }`}
          >
            {formatDate(d.date_expiration)}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (d) => (
        <StatutDocumentBadge
          statut={d.statut_calcule ?? d.statut}
          jours={d.jours_avant_expiration}
        />
      ),
    },
    {
      key: "fichier_url",
      header: "Fichier",
      render: (d) =>
        d.fichier_url ? (
          <a
            href={d.fichier_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="btn-secondary btn-sm gap-1 text-xs"
          >
            <Download size={11} /> Voir
          </a>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        ),
    },
    // Actions — renouveler + supprimer
    ...(peutCreer
      ? [
          {
            key: "actions",
            header: "",
            render: (d: any) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setRenouvDoc(d)}
                  className="btn-secondary btn-sm gap-1 text-xs"
                  title="Renouveler"
                >
                  <RefreshCw size={11} /> Renouveler
                </button>
                <button
                  onClick={() => {
                    if (confirm("Supprimer ce document ?"))
                      deleteMut.mutate(d.id);
                  }}
                  className="btn-icon text-gray-400 hover:text-red-500 ml-1"
                  title="Supprimer"
                >
                  <X size={13} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Modaux */}
      {modal && <DocumentModal onClose={() => setModal(false)} />}
      {renouvDoc && (
        <DocumentModal
          documentRenouv={renouvDoc}
          onClose={() => setRenouvDoc(null)}
        />
      )}

      <PageHeader
        title="Documents véhicules"
        subtitle={`${data?.meta?.total ?? 0} document(s)`}
        actions={
          <div className="flex flex-wrap gap-2">
            {peutCreer && (
              <button
                onClick={() => setModal(true)}
                className="btn-primary gap-2"
              >
                <Plus size={16} /> Nouveau document
              </button>
            )}
          </div>
        }
      />

      {/* KPIs alertes */}
      {alertes && nbExpires + nbCritiques + nbWarning > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Expirés",
              count: nbExpires,
              color: "bg-red-50 border-red-200",
              text: "text-red-600",
              icon: "🔴",
            },
            {
              label: "Critiques (< 15j)",
              count: nbCritiques,
              color: "bg-orange-50 border-orange-200",
              text: "text-orange-600",
              icon: "🟠",
            },
            {
              label: "À surveiller",
              count: nbWarning,
              color: "bg-yellow-50 border-yellow-200",
              text: "text-yellow-600",
              icon: "🟡",
            },
          ].map(({ label, count, color, text, icon }) => (
            <button
              key={label}
              onClick={() => {
                setAlertMode(true);
                setStatut("");
              }}
              disabled={count === 0}
              className={`card p-4 border text-left transition-all ${color} ${
                count > 0
                  ? "hover:shadow-md cursor-pointer"
                  : "opacity-50 cursor-default"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{icon}</span>
                <span className="text-xs text-gray-500 font-medium">
                  {label}
                </span>
              </div>
              <div className={`text-2xl font-bold ${text}`}>{count}</div>
            </button>
          ))}
        </div>
      )}

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
        rowKey={(d) => d.id}
        onRowClick={(d) =>
          navigate(`/vehicules/${d.vehicule_id}?tab=documents`)
        }
        emptyTitle="Aucun document"
        emptyDescription={
          alertMode
            ? "Aucun document expirant dans les 30 prochains jours."
            : "Aucun document enregistré."
        }
        filters={
          <div className="flex flex-wrap gap-2">
            {alertMode && (
              <button
                onClick={() => setAlertMode(false)}
                className="btn-danger btn-sm gap-1"
              >
                <AlertTriangle size={12} /> Alertes (30j)
                <X size={11} onClick={() => setAlertMode(false)} />
              </button>
            )}
            {!alertMode && (
              <>
                <select
                  value={agenceId}
                  onChange={(e) => {
                    setAgenceId(e.target.value);
                    setVehiculeId(""); // reset véhicule quand agence change
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

                {/* Véhicule — chargé dynamiquement selon l'agence */}
                <select
                  value={vehiculeId}
                  onChange={(e) => {
                    setVehiculeId(e.target.value);
                    setPage(1);
                  }}
                  className="input h-8 py-0 text-sm w-44"
                  disabled={loadingVehicules}
                >
                  <option value="">
                    {loadingVehicules ? "Chargement…" : "Tous véhicules"}
                  </option>
                  {(vehiculesFiltres as any[]).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.immatriculation} — {v.marque}
                    </option>
                  ))}
                </select>

                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setPage(1);
                  }}
                  className="input h-8 py-0 text-sm w-44"
                >
                  <option value="">Tous types</option>
                  {TYPES_DOCUMENT.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>

                <select
                  value={statut}
                  onChange={(e) => {
                    setStatut(e.target.value);
                    setPage(1);
                  }}
                  className="input h-8 py-0 text-sm w-36"
                >
                  <option value="">Tous statuts</option>
                  <option value="valide">✅ Valide</option>
                  <option value="warning">🟡 À surveiller</option>
                  <option value="critique">🟠 Critique</option>
                  <option value="expire">🔴 Expiré</option>
                </select>

                <button
                  onClick={() => {
                    setAlertMode(true);
                    setPage(1);
                  }}
                  className="btn-secondary btn-sm gap-1.5"
                >
                  <AlertTriangle size={13} />
                  Expirant &lt; 30j
                  {nbExpires + nbCritiques > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 font-bold">
                      {nbExpires + nbCritiques}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        }
      />
    </div>
  );
}
