import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ClipboardCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checklistsApi, chauffeursApi } from "@/api/operations.api";
import { authApi } from "@/api/auth.api";
import DataTable, { type Column } from "@/components/shared/DataTable";
import PageHeader from "@/components/shared/PageHeader";
import {
  ResultatChecklistBadge,
  StatutChecklistBadge,
} from "@/components/shared/StatutBadge";
import { CardLoading, LoadingSpinner } from "@/components/shared/LoadingPage";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatKm } from "@/utils";
import {
  CHECKLIST_SECTIONS,
  VALEUR_LABELS,
  ChecklistItem,
} from "./ChecklistFormComponents";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────
// Modal création — inline pour le chauffeur
// ─────────────────────────────────────────────────────────────

function NouvelleChecklistModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();
  const c = user?.chauffeur;

  const { data: meData } = useQuery({
    queryKey: ["me-vehicules-actifs"],
    queryFn: () =>
      authApi.me().then((r) => {
        setUser(r.data.data);
        return r.data.data;
      }),
    enabled: !!c?.id,
    staleTime: 30_000,
  });

  const vehiculesActifs = (() => {
    const fromApi = meData?.chauffeur?.vehicules_actifs;
    if (fromApi?.length) return fromApi;
    const fromStore = c?.vehicules_actifs;
    if (fromStore?.length) return fromStore;
    if (c?.vehicule_actuel)
      return [{ ...c.vehicule_actuel, type_carburant: null, agence_id: null }];
    return [];
  })();

  const [vehiculeSelectionne, setVehiculeSelectionne] = useState<
    number | undefined
  >(vehiculesActifs[0]?.vehicule_id);

  // Synchroniser quand vehiculesActifs se charge après le montage
  useEffect(() => {
    if (vehiculesActifs.length > 0 && !vehiculeSelectionne) {
      setVehiculeSelectionne(vehiculesActifs[0].vehicule_id);
    }
  }, [vehiculesActifs.length]); // eslint-disable-line

  const vehiculeActif =
    vehiculesActifs.find((v) => v.vehicule_id === vehiculeSelectionne) ??
    vehiculesActifs[0];

  const [type, setType] = useState("hebdomadaire_vehicule");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState("");
  const [obs, setObs] = useState("");
  const [dataJson, setDataJson] = useState<
    Record<string, Record<string, string>>
  >(() =>
    JSON.parse(JSON.stringify(CHECKLIST_SECTIONS["hebdomadaire_vehicule"])),
  );

  const TYPES_CL = [
    { value: "hebdomadaire_vehicule", label: "Hebdo véhicule", icon: "🚗" },
    { value: "hebdomadaire_scooter", label: "Hebdo scooter", icon: "🛵" },
    { value: "visite_technique", label: "Visite technique", icon: "🔍" },
    { value: "passation", label: "Passation", icon: "🔄" },
    { value: "attribution", label: "Attribution", icon: "➕" },
  ];

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setDataJson(JSON.parse(JSON.stringify(CHECKLIST_SECTIONS[newType] ?? {})));
  };

  const updateItem = (section: string, item: string, value: string) => {
    setDataJson((prev) => ({
      ...prev,
      [section]: { ...prev[section], [item]: value },
    }));
  };

  const nbNc = Object.values(dataJson)
    .flatMap((s) => Object.values(s))
    .filter((v) => ["mauvais", "non"].includes(v)).length;

  const mutation = useMutation({
    mutationFn: (data: object) => checklistsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklists-global"] });
      toast.success("Checklist créée et soumise.");
      onClose();
    },
    onError: (err: any) => {
      const first = err?.response?.data?.errors
        ? Object.values(
            err.response.data.errors as Record<string, string[]>,
          )[0]?.[0]
        : err?.response?.data?.message;
      toast.error(first ?? "Erreur.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculeActif) {
      toast.error("Aucun véhicule affecté. Contactez votre responsable.");
      return;
    }
    mutation.mutate({
      vehicule_id: vehiculeActif.vehicule_id,
      agence_id: user!.agence_id,
      chauffeur_id: c!.id,
      type_checklist: type,
      date,
      kilometrage: km ? parseInt(km) : undefined,
      observations: obs || undefined,
      data_json: dataJson,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Nouvelle checklist
            </h3>
            {vehiculeActif && (
              <p className="text-primary-200 text-xs mt-0.5">
                🚗 {vehiculeActif.immatriculation} —{" "}
                {vehiculeActif.marque_modele}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {nbNc > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">
                {nbNc} NC
              </span>
            )}
            <button
              onClick={onClose}
              className="text-primary-200 hover:text-white text-2xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        <form
          id="new-cl-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-5"
        >
          {/* Sélecteur véhicule si multi-affectation */}
          {vehiculesActifs.length > 1 && (
            <div>
              <label className="label">Véhicule concerné *</label>
              <select
                value={vehiculeSelectionne}
                onChange={(e) =>
                  setVehiculeSelectionne(parseInt(e.target.value))
                }
                className="input"
              >
                {vehiculesActifs.map((v) => (
                  <option key={v.vehicule_id} value={v.vehicule_id}>
                    {v.immatriculation} — {v.marque_modele}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Alerte véhicule manquant */}
          {vehiculesActifs.length === 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              ⚠ Aucun véhicule ne vous est affecté. Impossible de créer une
              checklist.
            </div>
          )}

          {/* Type */}
          <div>
            <label className="label">Type de checklist *</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES_CL.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all text-left ${
                    type === t.value
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

          {/* Date + Km */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                required
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <label className="label">Kilométrage</label>
              <input
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                className="input"
                min={0}
                placeholder="km au compteur"
              />
            </div>
          </div>

          {/* Grille de contrôle */}
          <div>
            <label className="label">
              Éléments de contrôle *
              {nbNc > 0 && (
                <span className="ml-2 text-xs text-red-600 font-normal">
                  {nbNc} non-conformité(s) détectée(s)
                </span>
              )}
            </label>
            <div className="space-y-3">
              {Object.entries(dataJson).map(([section, items]) => {
                const isBool = ["oui", "non"].includes(
                  Object.values(items)[0] ?? "",
                );
                const hasNc = Object.values(items).some((v) =>
                  ["mauvais", "non"].includes(v),
                );
                return (
                  <div
                    key={section}
                    className={`border rounded-xl overflow-hidden ${hasNc ? "border-red-200" : "border-gray-200"}`}
                  >
                    <div
                      className={`px-3 py-2 border-b flex items-center justify-between ${hasNc ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}
                    >
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        {section}
                      </span>
                      {hasNc && (
                        <span className="text-xs text-red-600 font-medium">
                          ⚠ Non-conforme
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-1">
                      {Object.entries(items).map(([item, val]) => (
                        <ChecklistItem
                          key={item}
                          label={item}
                          value={val}
                          onChange={(v) => updateItem(section, item, v)}
                          isBoolType={isBool}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="label">Observations</label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Remarques particulières, défauts non couverts…"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 rounded-b-2xl">
          <span
            className={`text-xs font-medium ${nbNc === 0 ? "text-green-600" : "text-red-600"}`}
          >
            {nbNc === 0 ? "✓ Tout est conforme" : `⚠ ${nbNc} non-conformité(s)`}
          </span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              form="new-cl-form"
              disabled={mutation.isPending || vehiculesActifs.length === 0}
              className="btn-primary gap-2"
            >
              {mutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" /> Envoi…
                </>
              ) : (
                <>
                  <ClipboardCheck size={15} /> Créer et soumettre
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page liste
// ─────────────────────────────────────────────────────────────

export default function ChecklistListPage() {
  const navigate = useNavigate();
  const { role, user } = useAuthStore();
  const isChauffeur = role === "chauffeur";
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState("");
  const [type, setType] = useState("");
  const [newModal, setNewModal] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["checklists-global", { page, statut, type, isChauffeur }],
    queryFn: () =>
      checklistsApi
        .list({
          page,
          per_page: 25,
          sort: "-date",
          include: "vehicule,chauffeur",
          "filter[statut]": statut || undefined,
          "filter[type_checklist]": type || undefined,
          // Filtre chauffeur connecté — backend scope par chauffeur_id
          "filter[chauffeur_id]":
            isChauffeur && user?.chauffeur?.id
              ? String(user.chauffeur.id)
              : undefined,
        })
        .then((r) => r.data),
  });

  // Colonnes adaptées selon le rôle
  const columns: Column<any>[] = [
    { key: "date", header: "Date", render: (c) => formatDate(c.date) },
    {
      key: "vehicule",
      header: "Véhicule",
      render: (c) => (
        <span className="font-mono text-primary-700 font-semibold text-sm">
          {c.vehicule?.immatriculation ?? "—"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (c) => (
        <span className="text-sm capitalize">
          {c.type_checklist?.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "resultat",
      header: "Résultat",
      render: (c) => <ResultatChecklistBadge resultat={c.resultat_global} />,
    },
    {
      key: "statut",
      header: "Statut",
      render: (c) => <StatutChecklistBadge statut={c.statut} />,
    },
    {
      key: "nc",
      header: "NC",
      render: (c) =>
        c.nb_non_conformites > 0 ? (
          <span className="badge badge-warning">{c.nb_non_conformites}</span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        ),
    },
    { key: "km", header: "Km", render: (c) => formatKm(c.kilometrage) },
    // Colonne chauffeur masquée pour le chauffeur lui-même
    ...(!isChauffeur
      ? [
          {
            key: "chauffeur",
            header: "Chauffeur",
            render: (c: any) => c.chauffeur?.nom ?? "—",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {newModal && (
        <NouvelleChecklistModal onClose={() => setNewModal(false)} />
      )}

      <PageHeader
        title={isChauffeur ? "Mes checklists" : "Checklists"}
        subtitle={`${data?.meta?.total ?? 0} checklist(s)`}
        actions={
          // Le chauffeur crée via modal inline ; les gestionnaires n'ont pas de page de création séparée
          isChauffeur ? (
            <button
              onClick={() => setNewModal(true)}
              className="btn-primary gap-2"
            >
              <Plus size={16} /> Nouvelle checklist
            </button>
          ) : undefined
        }
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
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/checklists/${c.id}`)}
        emptyTitle="Aucune checklist"
        emptyDescription={
          isChauffeur
            ? "Créez votre première checklist hebdomadaire."
            : "Aucune checklist enregistrée."
        }
        filters={
          <div className="flex flex-wrap gap-2">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-40"
            >
              <option value="">Tous types</option>
              <option value="hebdomadaire_vehicule">Hebdo véhicule</option>
              <option value="hebdomadaire_scooter">Hebdo scooter</option>
              <option value="visite_technique">Visite technique</option>
              <option value="passation">Passation</option>
              <option value="attribution">Attribution</option>
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
              <option value="brouillon">Brouillon</option>
              <option value="soumis">Soumis</option>
              <option value="valide">Validé</option>
              <option value="rejete">Rejeté</option>
            </select>
          </div>
        }
      />
    </div>
  );
}
