import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Car,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  Plus,
  Edit3,
  CheckCircle,
  ChevronLeft,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vehiculesApi } from "@/api/vehicules.api";
import { checklistsApi, signalementsApi } from "@/api/operations.api";
import {
  CardLoading,
  ErrorState,
  LoadingSpinner,
} from "@/components/shared/LoadingPage";
import {
  ResultatChecklistBadge,
  StatutChecklistBadge,
} from "@/components/shared/StatutBadge";
import { GraviteBadge } from "@/components/shared/StatutBadge";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatKm } from "@/utils";
import {
  CHECKLIST_SECTIONS,
  VALEUR_LABELS,
  ChecklistItem,
} from "@/pages/Checklists/ChecklistFormComponents";
import toast from "react-hot-toast";
import { LoadingSpinner as Spinner } from "@/components/shared/LoadingPage";

// ─────────────────────────────────────────────────────────────
// Modal mise à jour kilométrage
// ─────────────────────────────────────────────────────────────

function MajKmModal({
  vehicule,
  onClose,
}: {
  vehicule: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [km, setKm] = useState(String(vehicule.kilometrage_actuel));

  const mut = useMutation({
    mutationFn: () => vehiculesApi.updateKilometrage(vehicule.id, parseInt(km)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicule", vehicule.id] });
      toast.success("Kilométrage mis à jour.");
      onClose();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6">
        <h3 className="font-semibold text-lg mb-1">
          Mettre à jour le kilométrage
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Actuel : <strong>{formatKm(vehicule.kilometrage_actuel)}</strong>
        </p>
        <div>
          <label className="label">Nouveau kilométrage *</label>
          <input
            type="number"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            className="input text-xl font-mono"
            min={vehicule.kilometrage_actuel}
            autoFocus
          />
          {parseInt(km) < vehicule.kilometrage_actuel && (
            <p className="error-msg">
              Le kilométrage ne peut pas être inférieur au kilométrage actuel.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3 justify-end mt-5">
          <button onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={
              mut.isPending || parseInt(km) < vehicule.kilometrage_actuel || !km
            }
            className="btn-primary gap-2"
          >
            {mut.isPending ? (
              <>
                <LoadingSpinner size="sm" /> Mise à jour…
              </>
            ) : (
              <>
                <CheckCircle size={15} /> Valider
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal nouvelle checklist (inline — réutilisée ici)
// ─────────────────────────────────────────────────────────────

function NouvelleChecklistModal({
  vehiculeId,
  agenceId,
  kmActuel,
  onClose,
}: {
  vehiculeId: number;
  agenceId: number;
  kmActuel: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [type, setType] = useState("hebdomadaire_vehicule");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState(String(kmActuel));
  const [obs, setObs] = useState("");
  const [dataJson, setDataJson] = useState<
    Record<string, Record<string, string>>
  >(() =>
    JSON.parse(JSON.stringify(CHECKLIST_SECTIONS["hebdomadaire_vehicule"])),
  );

  const TYPES = [
    { value: "hebdomadaire_vehicule", label: "Hebdo véhicule", icon: "🚗" },
    { value: "hebdomadaire_scooter", label: "Hebdo scooter", icon: "🛵" },
    { value: "visite_technique", label: "Visite tech.", icon: "🔍" },
    { value: "passation", label: "Passation", icon: "🔄" },
    { value: "attribution", label: "Attribution", icon: "➕" },
  ];

  const handleTypeChange = (t: string) => {
    setType(t);
    setDataJson(JSON.parse(JSON.stringify(CHECKLIST_SECTIONS[t] ?? {})));
  };

  const updateItem = (section: string, item: string, value: string) =>
    setDataJson((prev) => ({
      ...prev,
      [section]: { ...prev[section], [item]: value },
    }));

  const nbNc = Object.values(dataJson)
    .flatMap((s) => Object.values(s))
    .filter((v) => ["mauvais", "non"].includes(v)).length;

  const mut = useMutation({
    mutationFn: (data: object) => checklistsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v-checks-chauffeur", vehiculeId] });
      toast.success("Checklist créée.");
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
    mut.mutate({
      vehicule_id: vehiculeId,
      agence_id: agenceId,
      chauffeur_id: user?.chauffeur?.id,
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
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Nouvelle checklist
            </h3>
            <p className="text-primary-200 text-xs mt-0.5">
              {nbNc > 0 ? (
                <span className="text-red-300">⚠ {nbNc} non-conformité(s)</span>
              ) : (
                "✓ Tout est conforme"
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-primary-200 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>
        <form
          id="cl-v-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-5"
        >
          <div>
            <label className="label">Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
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
              />
            </div>
          </div>
          <div>
            <label className="label">Éléments de contrôle *</label>
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
                      className={`px-3 py-2 border-b flex justify-between ${hasNc ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}
                    >
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        {section}
                      </span>
                      {hasNc && (
                        <span className="text-xs text-red-600 font-medium">
                          ⚠ NC
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
          <div>
            <label className="label">Observations</label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Remarques particulières…"
            />
          </div>
        </form>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 rounded-b-2xl">
          <span
            className={`text-xs font-medium ${nbNc === 0 ? "text-green-600" : "text-red-600"}`}
          >
            {nbNc === 0 ? "✓ Conforme" : `⚠ ${nbNc} NC`}
          </span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              form="cl-v-form"
              disabled={mut.isPending}
              className="btn-primary gap-2"
            >
              {mut.isPending ? (
                <>
                  <LoadingSpinner size="sm" /> Envoi…
                </>
              ) : (
                <>
                  <Plus size={15} /> Créer
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
// Page principale — Vue chauffeur
// ─────────────────────────────────────────────────────────────

const TABS = [
  { key: "info", label: "Mon véhicule", icon: <Car size={14} /> },
  { key: "documents", label: "Documents", icon: <FileText size={14} /> },
  {
    key: "checklists",
    label: "Checklists",
    icon: <ClipboardCheck size={14} />,
  },
  {
    key: "signalements",
    label: "Signalements",
    icon: <AlertTriangle size={14} />,
  },
];

export default function VehiculeDetailChauffeurPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const vehiculeId = parseInt(id!);

  const [tab, setTab] = useState("info");
  const [kmModal, setKmModal] = useState(false);
  const [checklistModal, setChecklistModal] = useState(false);

  // Véhicule
  const {
    data: vehicule,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["vehicule", vehiculeId],
    queryFn: () => vehiculesApi.get(vehiculeId).then((r) => r.data.data),
  });

  // Checklists du chauffeur sur ce véhicule
  const chauffeurId = user?.chauffeur?.id;
  const { data: checks, isLoading: lChecks } = useQuery({
    queryKey: ["v-checks-chauffeur", vehiculeId, chauffeurId],
    queryFn: () =>
      checklistsApi
        .list({
          per_page: 10,
          sort: "-date",
          "filter[vehicule_id]": vehiculeId,
          "filter[chauffeur_id]": chauffeurId,
        })
        .then((r) => r.data),
    enabled: tab === "checklists" && !!chauffeurId,
  });

  // Signalements du chauffeur sur ce véhicule
  const { data: signaux, isLoading: lSignaux } = useQuery({
    queryKey: ["v-signaux-chauffeur", vehiculeId, chauffeurId],
    queryFn: () =>
      signalementsApi
        .list({
          per_page: 10,
          sort: "-date_signalement",
          "filter[vehicule_id]": vehiculeId,
          "filter[chauffeur_id]": chauffeurId,
        })
        .then((r) => r.data),
    enabled: tab === "signalements" && !!chauffeurId,
  });

  if (isLoading)
    return (
      <div className="p-6">
        <CardLoading rows={6} />
      </div>
    );
  if (error || !vehicule)
    return (
      <ErrorState
        message="Véhicule non trouvé ou accès non autorisé."
        onRetry={refetch}
      />
    );

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Modaux */}
      {kmModal && (
        <MajKmModal vehicule={vehicule} onClose={() => setKmModal(false)} />
      )}
      {checklistModal && (
        <NouvelleChecklistModal
          vehiculeId={vehiculeId}
          agenceId={vehicule.agence_id}
          kmActuel={vehicule.kilometrage_actuel}
          onClose={() => setChecklistModal(false)}
        />
      )}

      {/* Header compact */}
      <div className="card p-5 bg-primary-50 border-primary-200">
        {/* Bouton Retour — affiché uniquement si le chauffeur a plusieurs véhicules */}
        {(user?.chauffeur?.vehicules_actifs?.length ?? 0) > 1 && (
          <button
            onClick={() => navigate("/mon-vehicule")}
            className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-700 mb-3 transition-colors"
          >
            <ChevronLeft size={14} />
            Retour à mes véhicules
          </button>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Car size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-700 font-mono leading-tight">
                {vehicule.immatriculation}
              </h1>
              <p className="text-sm text-primary-500">
                {vehicule.marque} {vehicule.modele}
                {vehicule.annee_fabrication &&
                  ` · ${vehicule.annee_fabrication}`}
              </p>
            </div>
          </div>
          {/* Km + bouton mise à jour */}
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-gray-800">
              {formatKm(vehicule.kilometrage_actuel)}
            </p>
            <button
              onClick={() => setKmModal(true)}
              className="btn-secondary btn-sm gap-1.5 mt-1"
            >
              <Edit3 size={12} /> Mettre à jour
            </button>
          </div>
        </div>

        {/* Alertes documents */}
        {(["expire", "critique", "warning"].includes(
          vehicule.statut_vt ?? "",
        ) ||
          ["expire", "critique", "warning"].includes(
            vehicule.statut_assurance ?? "",
          )) && (
          <div className="mt-3 pt-3 border-t border-primary-200 flex flex-col gap-1.5">
            {["expire", "critique", "warning"].includes(
              vehicule.statut_vt ?? "",
            ) && (
              <div
                className={`flex items-center gap-2 text-xs font-medium ${vehicule.statut_vt === "expire" ? "text-red-600" : "text-yellow-600"}`}
              >
                <span>{vehicule.statut_vt === "expire" ? "🔴" : "🟡"}</span>
                Visite technique{" "}
                {vehicule.statut_vt === "expire"
                  ? "expirée"
                  : `expire dans ${vehicule.jours_avant_vt}j`}
                {vehicule.date_prochaine_visite_tech &&
                  ` (${formatDate(vehicule.date_prochaine_visite_tech)})`}
              </div>
            )}
            {["expire", "critique", "warning"].includes(
              vehicule.statut_assurance ?? "",
            ) && (
              <div
                className={`flex items-center gap-2 text-xs font-medium ${vehicule.statut_assurance === "expire" ? "text-red-600" : "text-yellow-600"}`}
              >
                <span>
                  {vehicule.statut_assurance === "expire" ? "🔴" : "🟡"}
                </span>
                Assurance{" "}
                {vehicule.statut_assurance === "expire"
                  ? "expirée"
                  : `expire dans ${vehicule.jours_avant_assurance}j`}
                {vehicule.date_expiration_assurance &&
                  ` (${formatDate(vehicule.date_expiration_assurance)})`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0.5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "border-primary-700 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Onglet Infos ── */}
      {tab === "info" && (
        <div className="space-y-4">
          {/* Infos essentielles */}
          <div className="card p-5">
            <h3 className="section-title">Caractéristiques</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                ["Type", vehicule.type_vehicule],
                ["Énergie", vehicule.energie],
                ["Couleur", vehicule.couleur],
                ["Année", vehicule.annee_fabrication],
                ["N° châssis", vehicule.numero_chassis],
                ["Catégorie", vehicule.categorie],
              ]
                .filter(([, v]) => v)
                .map(([l, v]) => (
                  <div
                    key={l as string}
                    className="flex justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm"
                  >
                    <dt className="text-gray-400">{l}</dt>
                    <dd className="font-medium text-gray-800 capitalize">
                      {v as string}
                    </dd>
                  </div>
                ))}
            </div>
          </div>

          {/* Prochain entretien */}
          <div className="card p-5">
            <h3 className="section-title">Entretien</h3>
            <div className="space-y-2">
              {[
                [
                  "Dernier entretien",
                  vehicule.date_derniere_visite_tech
                    ? formatDate(vehicule.date_derniere_visite_tech)
                    : "—",
                ],
                [
                  "Prochain entretien (km)",
                  vehicule.prochain_entretien_km
                    ? formatKm(vehicule.prochain_entretien_km)
                    : "—",
                ],
                [
                  "Prochain entretien (date)",
                  vehicule.prochain_entretien_date
                    ? formatDate(vehicule.prochain_entretien_date)
                    : "—",
                ],
              ].map(([l, v]) => (
                <div
                  key={l as string}
                  className="flex justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm"
                >
                  <dt className="text-gray-400">{l}</dt>
                  <dd className="font-medium text-gray-800">{v as string}</dd>
                </div>
              ))}
              {vehicule.prochain_entretien_km &&
                vehicule.kilometrage_actuel && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Km restants avant entretien</span>
                      <span className="font-medium text-gray-700">
                        {formatKm(
                          Math.max(
                            0,
                            vehicule.prochain_entretien_km -
                              vehicule.kilometrage_actuel,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          vehicule.prochain_entretien_km -
                            vehicule.kilometrage_actuel <
                          500
                            ? "bg-red-500"
                            : "bg-success"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              (vehicule.kilometrage_actuel /
                                vehicule.prochain_entretien_km) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ── Onglet Documents ── */}
      {tab === "documents" && (
        <div className="card p-5">
          <h3 className="section-title">Documents de bord</h3>
          <div className="space-y-3">
            {[
              {
                label: "Assurance",
                statut: vehicule.statut_assurance,
                detail: vehicule.compagnie_assurance
                  ? `${vehicule.compagnie_assurance} · N°${vehicule.numero_assurance}`
                  : (vehicule.numero_assurance ?? "—"),
                expire: vehicule.date_expiration_assurance,
                jours: vehicule.jours_avant_assurance,
              },
              {
                label: "Visite technique",
                statut: vehicule.statut_vt,
                detail: vehicule.date_derniere_visite_tech
                  ? `Dernière : ${formatDate(vehicule.date_derniere_visite_tech)}`
                  : "Aucune visite enregistrée",
                expire: vehicule.date_prochaine_visite_tech,
                jours: vehicule.jours_avant_vt,
              },
            ].map((doc) => (
              <div
                key={doc.label}
                className={`p-4 rounded-xl border flex items-center gap-4 ${
                  doc.statut === "expire"
                    ? "bg-red-50 border-red-200"
                    : doc.statut === "critique" || doc.statut === "warning"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-green-50 border-green-200"
                }`}
              >
                <span className="text-2xl flex-shrink-0">
                  {doc.statut === "expire"
                    ? "🔴"
                    : ["critique", "warning"].includes(doc.statut ?? "")
                      ? "🟡"
                      : "✅"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">
                    {doc.label}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{doc.detail}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {doc.expire && (
                    <p className="text-xs font-medium text-gray-700">
                      {formatDate(doc.expire)}
                    </p>
                  )}
                  {doc.jours != null && (
                    <p
                      className={`text-xs font-semibold ${
                        doc.statut === "expire"
                          ? "text-red-600"
                          : ["critique", "warning"].includes(doc.statut ?? "")
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {doc.statut === "expire"
                        ? "Expiré"
                        : `${doc.jours}j restants`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Onglet Checklists ── */}
      {tab === "checklists" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Mes checklists sur ce véhicule
            </h3>
            <button
              onClick={() => setChecklistModal(true)}
              className="btn-primary btn-sm gap-1.5"
            >
              <Plus size={13} /> Nouvelle
            </button>
          </div>
          {lChecks ? (
            <CardLoading rows={3} />
          ) : !checks?.data || checks.data.length === 0 ? (
            <div className="text-center py-10">
              <ClipboardCheck
                size={36}
                className="mx-auto text-gray-200 mb-2"
              />
              <p className="text-gray-400 text-sm">
                Aucune checklist pour ce véhicule.
              </p>
              <button
                onClick={() => setChecklistModal(true)}
                className="btn-primary gap-2 mt-3"
              >
                <Plus size={14} /> Créer une checklist
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {checks.data.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/checklists/${c.id}`)}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                      c.resultat_global === "conforme"
                        ? "bg-success"
                        : c.resultat_global === "non_conforme"
                          ? "bg-danger"
                          : "bg-gray-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold capitalize">
                        {c.type_checklist?.replace(/_/g, " ")}
                      </span>
                      <StatutChecklistBadge statut={c.statut} />
                      {c.nb_non_conformites > 0 && (
                        <span className="badge badge-warning text-xs">
                          {c.nb_non_conformites} NC
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDate(c.date)}
                      {c.kilometrage && ` · ${formatKm(c.kilometrage)}`}
                    </div>
                  </div>
                  <ResultatChecklistBadge resultat={c.resultat_global} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Signalements ── */}
      {tab === "signalements" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Mes signalements sur ce véhicule
            </h3>
            <button
              onClick={() =>
                navigate(`/signalements/nouveau?vehicule_id=${vehiculeId}`)
              }
              className="btn-danger btn-sm gap-1.5"
            >
              <AlertTriangle size={13} /> Signaler
            </button>
          </div>
          {lSignaux ? (
            <CardLoading rows={3} />
          ) : !signaux?.data || signaux.data.length === 0 ? (
            <div className="text-center py-10">
              <AlertTriangle size={36} className="mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">
                Aucun signalement pour ce véhicule.
              </p>
              <button
                onClick={() =>
                  navigate(`/signalements/nouveau?vehicule_id=${vehiculeId}`)
                }
                className="btn-danger gap-2 mt-3"
              >
                <AlertTriangle size={14} /> Signaler un défaut
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {signaux.data.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/signalements/${s.id}`)}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-red-50 hover:border-red-200 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                      s.gravite === "critique" || s.gravite === "haute"
                        ? "bg-danger"
                        : s.gravite === "moyenne"
                          ? "bg-warning"
                          : "bg-info"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {s.titre}
                      </span>
                      <GraviteBadge gravite={s.gravite} />
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {s.type_defaut?.replace(/_/g, " ")} ·{" "}
                      {formatDate(s.date_signalement)}
                    </div>
                  </div>
                  <span
                    className={`badge flex-shrink-0 ${
                      s.statut === "resolu"
                        ? "badge-success"
                        : s.statut === "nouveau"
                          ? "badge-danger"
                          : s.statut === "en_cours"
                            ? "badge-warning"
                            : "badge-gray"
                    }`}
                  >
                    {s.statut.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
