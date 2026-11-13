import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Send, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checklistsApi } from "@/api/operations.api";
import PageHeader from "@/components/shared/PageHeader";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  CardLoading,
  ErrorState,
  LoadingSpinner,
} from "@/components/shared/LoadingPage";
import {
  ResultatChecklistBadge,
  StatutChecklistBadge,
} from "@/components/shared/StatutBadge";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatKm } from "@/utils";
import { VALEUR_LABELS } from "./ChecklistFormComponents";
import { useState } from "react";
import toast from "react-hot-toast";

// ── Grille lecture seule des contrôles ────────────────────────
function DataJsonReadOnly({
  dataJson,
}: {
  dataJson: Record<string, Record<string, string | null>>;
}) {
  const VALEURS_NC = ["mauvais", "non"];

  return (
    <div className="space-y-4">
      {Object.entries(dataJson).map(([section, items]) => {
        const hasNc = Object.values(items).some(
          (v) => v !== null && VALEURS_NC.includes(v),
        );
        return (
          <div
            key={section}
            className={`border rounded-xl overflow-hidden ${hasNc ? "border-red-200" : "border-gray-200"}`}
          >
            <div
              className={`px-4 py-2 border-b flex items-center justify-between ${hasNc ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                {section}
              </span>
              {hasNc && (
                <span className="text-xs text-red-600 font-medium">
                  ⚠ Non-conforme
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-0 divide-x divide-gray-50">
              {Object.entries(items).map(([item, val]) => {
                const isNc = VALEURS_NC.includes(String(val));
                const meta = VALEUR_LABELS[String(val)];
                return (
                  <div
                    key={item}
                    className={`flex items-center justify-between px-4 py-2 border-b border-gray-50 last:border-0 ${isNc ? "bg-red-50" : ""}`}
                  >
                    <span className="text-xs text-gray-600 capitalize mr-3">
                      {item.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded border ${meta?.color ?? "bg-gray-100 text-gray-500 border-gray-200"}`}
                    >
                      {meta?.label ?? String(val).toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function ChecklistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole, role } = useAuthStore();
  const checklistId = parseInt(id!);
  const isChauffeur = role === "chauffeur";

  const [soumettreOpen, setSoumettreOpen] = useState(false);
  const [validerOpen, setValiderOpen] = useState(false);
  const [rejeterOpen, setRejeterOpen] = useState(false);
  const [motifRejet, setMotifRejet] = useState("");

  const {
    data: cl,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["checklist", checklistId],
    queryFn: () => checklistsApi.get(checklistId).then((r) => r.data.data),
  });

  const soumettreMut = useMutation({
    mutationFn: () => checklistsApi.soumettre(checklistId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist", checklistId] });
      qc.invalidateQueries({ queryKey: ["checklists-global"] });
      toast.success("Checklist soumise pour validation.");
      setSoumettreOpen(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const validerMut = useMutation({
    mutationFn: () => checklistsApi.valider(checklistId, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist", checklistId] });
      qc.invalidateQueries({ queryKey: ["checklists-global"] });
      // Si non conforme → signalement généré automatiquement
      const msg =
        cl?.resultat_global === "non_conforme"
          ? "Checklist validée. Un signalement a été créé automatiquement."
          : "Checklist validée.";
      toast.success(msg);
      setValiderOpen(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const rejeterMut = useMutation({
    mutationFn: () => checklistsApi.rejeter(checklistId, { motif: motifRejet }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist", checklistId] });
      qc.invalidateQueries({ queryKey: ["checklists-global"] });
      toast.success("Checklist rejetée.");
      setRejeterOpen(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  if (isLoading)
    return (
      <div className="card p-6">
        <CardLoading rows={8} />
      </div>
    );
  if (error || !cl)
    return <ErrorState message="Checklist non trouvée." onRetry={refetch} />;

  const peutSoumettre = cl.statut === "brouillon";
  const peutValider =
    cl.statut === "soumis" &&
    hasRole("super_admin", "directeur", "resp_parc", "resp_agence");
  const peutRejeter =
    cl.statut === "soumis" &&
    hasRole("super_admin", "directeur", "resp_parc", "resp_agence");
  const nbNc = cl.nb_non_conformites ?? 0;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Confirmations */}
      <ConfirmDialog
        open={soumettreOpen}
        onClose={() => setSoumettreOpen(false)}
        onConfirm={() => soumettreMut.mutate()}
        loading={soumettreMut.isPending}
        title="Soumettre la checklist"
        message={`Soumettre cette checklist ${nbNc > 0 ? `avec ${nbNc} non-conformité(s)` : "conforme"} pour validation ?`}
        confirmLabel="Soumettre"
        variant="info"
      />
      <ConfirmDialog
        open={validerOpen}
        onClose={() => setValiderOpen(false)}
        onConfirm={() => validerMut.mutate()}
        loading={validerMut.isPending}
        title="Valider la checklist"
        message={
          cl.resultat_global === "non_conforme"
            ? `Cette checklist a ${nbNc} non-conformité(s). La validation créera automatiquement un signalement.`
            : "Confirmer la validation de cette checklist conforme ?"
        }
        confirmLabel="Valider"
        variant={cl.resultat_global === "non_conforme" ? "warning" : "info"}
      />

      {/* Rejet modal */}
      {rejeterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setRejeterOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-3">Rejeter la checklist</h3>
            <div>
              <label className="label">Motif *</label>
              <textarea
                value={motifRejet}
                onChange={(e) => setMotifRejet(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Expliquez la raison du rejet…"
              />
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setRejeterOpen(false)}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={() => rejeterMut.mutate()}
                disabled={!motifRejet.trim() || rejeterMut.isPending}
                className="btn-danger gap-2"
              >
                {rejeterMut.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <XCircle size={14} /> Rejeter
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <PageHeader
        title={`Checklist — ${cl.type_checklist?.replace(/_/g, " ")}`}
        subtitle={`${cl.vehicule?.immatriculation ?? "—"} · ${formatDate(cl.date)}`}
        backTo={
          isChauffeur
            ? "/checklists"
            : cl.vehicule_id
              ? `/vehicules/${cl.vehicule_id}`
              : "/checklists"
        }
        actions={
          <div className="flex gap-2">
            {peutSoumettre && (
              <button
                onClick={() => setSoumettreOpen(true)}
                className="btn-primary gap-2"
              >
                <Send size={15} /> Soumettre
              </button>
            )}
            {peutValider && (
              <button
                onClick={() => setValiderOpen(true)}
                className={`gap-2 ${
                  cl.resultat_global === "non_conforme"
                    ? "btn bg-yellow-600 text-white hover:bg-yellow-700"
                    : "btn-primary"
                }`}
              >
                <CheckCircle size={15} /> Valider
              </button>
            )}
            {peutRejeter && (
              <button
                onClick={() => setRejeterOpen(true)}
                className="btn-danger gap-2"
              >
                <XCircle size={15} /> Rejeter
              </button>
            )}
          </div>
        }
      />

      {/* Badges statut */}
      <div className="flex flex-wrap gap-2">
        <StatutChecklistBadge statut={cl.statut} />
        <ResultatChecklistBadge resultat={cl.resultat_global} />
        {nbNc > 0 && (
          <span className="badge badge-danger">{nbNc} non-conformité(s)</span>
        )}
      </div>

      {/* Alerte chauffeur si rejeté */}
      {isChauffeur && cl.statut === "rejete" && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              Checklist rejetée
            </p>
            {cl.motif_rejet && (
              <p className="text-sm text-red-600 mt-0.5">{cl.motif_rejet}</p>
            )}
          </div>
        </div>
      )}

      {/* Alerte signalement généré */}
      {cl.signalement_genere_id && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-orange-600">⚠</span>
            <p className="text-sm font-medium text-orange-700">
              Un signalement a été créé automatiquement suite aux
              non-conformités.
            </p>
          </div>
          {!isChauffeur && (
            <button
              onClick={() =>
                navigate(`/signalements/${cl.signalement_genere_id}`)
              }
              className="btn-secondary btn-sm"
            >
              Voir →
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Informations */}
        <div className="card p-5">
          <h3 className="section-title">Informations</h3>
          <dl className="space-y-2">
            {[
              [
                "Véhicule",
                cl.vehicule
                  ? `${cl.vehicule.immatriculation} — ${cl.vehicule.marque} ${cl.vehicule.modele}`
                  : "—",
              ],
              ["Kilométrage", formatKm(cl.kilometrage)],
              ...(!isChauffeur
                ? [["Chauffeur", cl.chauffeur?.nom ?? "—"]]
                : []),
              ["Date", formatDate(cl.date)],
              ["Validé par", cl.valide_par ?? "—"],
              ["Rejeté motif", cl.motif_rejet ?? null],
            ]
              .filter(([, v]) => v !== null)
              .map(([l, v]) => (
                <div
                  key={l as string}
                  className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"
                >
                  <dt className="text-gray-500">{l}</dt>
                  <dd className="font-medium text-gray-900 text-right ml-4">
                    {v as string}
                  </dd>
                </div>
              ))}
          </dl>
        </div>

        {/* Non-conformités */}
        {nbNc > 0 && (
          <div className="card p-5">
            <h3 className="section-title text-red-600">
              Non-conformités ({nbNc})
            </h3>
            <div className="space-y-2">
              {(cl.non_conformites ?? []).map((nc: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 bg-red-50 rounded-lg"
                >
                  <span
                    className={`mt-0.5 flex-shrink-0 ${nc.critique ? "text-red-500" : "text-yellow-500"}`}
                  >
                    {nc.critique ? "🔴" : "🟡"}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-gray-700 capitalize">
                      {nc.section}
                    </span>
                    <span className="text-xs text-gray-500"> — </span>
                    <span className="text-xs text-gray-700 capitalize">
                      {nc.item?.replace(/_/g, " ")}
                    </span>
                    <span className="ml-1 text-xs font-bold text-red-600">
                      ({nc.valeur})
                    </span>
                    {nc.critique && (
                      <span className="ml-2 text-xs text-red-500 font-medium">
                        ⚠ Critique
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Observations */}
      {cl.observations && (
        <div className="card p-5">
          <h3 className="section-title">Observations</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {cl.observations}
          </p>
        </div>
      )}

      {/* Détail des contrôles */}
      {cl.data_json && Object.keys(cl.data_json).length > 0 && (
        <div className="card p-5">
          <h3 className="section-title">Détail des contrôles</h3>
          <DataJsonReadOnly dataJson={cl.data_json} />
        </div>
      )}
    </div>
  );
}
