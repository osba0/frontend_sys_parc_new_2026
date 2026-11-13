import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { maintenancesApi, rapportsApi } from "@/api/finance.api";
import PageHeader from "@/components/shared/PageHeader";
import {
  CardLoading,
  ErrorState,
  LoadingSpinner,
} from "@/components/shared/LoadingPage";
import { StatutMaintenanceBadge } from "@/components/shared/StatutBadge";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useAuthStore } from "@/stores/authStore";
import {
  formatCfa,
  formatDate,
  formatKm,
  getTypeOperationLabel,
  downloadBlob,
} from "@/utils";
import type { Maintenance } from "@/types";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────
// Modal — Clôture
// ─────────────────────────────────────────────────────────────

function CloturerModal({
  maintenance,
  onClose,
}: {
  maintenance: Maintenance;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  // Kilométrage : priorité au km actuel du véhicule (plus récent que celui de la maintenance)
  const kmVehicule = maintenance.vehicule?.kilometrage_actuel ?? null;
  const kmMaint = maintenance.kilometrage ?? null;
  const kmInitial = kmVehicule ?? kmMaint ?? "";

  // Montant TTC : calculé depuis HT + TVA si TTC non renseigné
  const ttcInitial = (() => {
    if (maintenance.montant_ttc && maintenance.montant_ttc > 0)
      return maintenance.montant_ttc;
    if (maintenance.montant_ht && maintenance.montant_ht > 0) {
      const tva = maintenance.tva ?? 18;
      return Math.round(maintenance.montant_ht * (1 + tva / 100));
    }
    return "";
  })();

  const [montantHt, setMontantHt] = useState(
    String(maintenance.montant_ht ?? ""),
  );
  const [tva, setTva] = useState(String(maintenance.tva ?? 18));
  const [montantTtc, setMontantTtc] = useState(String(ttcInitial));
  const [facture, setFacture] = useState(maintenance.numero_facture ?? "");
  const [dateSortie, setDateSortie] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [km, setKm] = useState(String(kmInitial));
  const [kmModifie, setKmModifie] = useState(false);

  // Recalculer TTC automatiquement quand HT ou TVA change
  const recalculerTtc = (ht: string, tvaVal: string) => {
    const htNum = parseFloat(ht);
    const tvaNum = parseFloat(tvaVal);
    if (!isNaN(htNum) && htNum > 0 && !isNaN(tvaNum)) {
      setMontantTtc(String(Math.round(htNum * (1 + tvaNum / 100))));
    }
  };

  const handleHtChange = (val: string) => {
    setMontantHt(val);
    recalculerTtc(val, tva);
  };

  const handleTvaChange = (val: string) => {
    setTva(val);
    recalculerTtc(montantHt, val);
  };

  const mutation = useMutation({
    mutationFn: (data: object) =>
      maintenancesApi.cloturer(maintenance.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", maintenance.id] });
      qc.invalidateQueries({ queryKey: ["v-maints", maintenance.vehicule_id] });
      qc.invalidateQueries({ queryKey: ["vehicule", maintenance.vehicule_id] });
      qc.invalidateQueries({ queryKey: ["maintenances"] });
      toast.success("Maintenance clôturée. Véhicule remis en service.");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Erreur lors de la clôture.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      montant_ht: montantHt ? parseFloat(montantHt) : undefined,
      tva: tva ? parseFloat(tva) : undefined,
      montant_ttc: montantTtc ? parseFloat(montantTtc) : undefined,
      numero_facture: facture || undefined,
      date_sortie: dateSortie || undefined,
      kilometrage: km ? parseInt(km) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
        {/* Header */}
        <div className="bg-success rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Clôturer la maintenance
            </h3>
            <p className="text-green-100 text-xs mt-0.5">
              Le véhicule sera remis au statut actif
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-green-100 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Montant */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Montant
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">HT (FCFA)</label>
                <input
                  type="number"
                  value={montantHt}
                  onChange={(e) => handleHtChange(e.target.value)}
                  className="input"
                  min={0}
                  step={100}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">TVA (%)</label>
                <input
                  type="number"
                  value={tva}
                  onChange={(e) => handleTvaChange(e.target.value)}
                  className="input"
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
              <div>
                <label className="label flex items-center gap-1">
                  TTC (FCFA)
                  <span className="text-primary-500 text-xs font-normal">
                    auto
                  </span>
                </label>
                <input
                  type="number"
                  value={montantTtc}
                  onChange={(e) => setMontantTtc(e.target.value)}
                  className="input font-semibold text-primary-700"
                  min={0}
                  step={100}
                  placeholder="Calculé auto"
                />
              </div>
            </div>
            {montantHt && tva && (
              <p className="text-xs text-primary-600">
                ✓ {parseFloat(montantHt).toLocaleString("fr-FR")} × (1 + {tva}%)
                ={" "}
                <strong>
                  {parseInt(montantTtc || "0").toLocaleString("fr-FR")} FCFA
                </strong>
              </p>
            )}
          </div>

          {/* Facture + date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">N° facture</label>
              <input
                value={facture}
                onChange={(e) => setFacture(e.target.value)}
                className="input"
                placeholder="FAC-2025-001"
              />
            </div>
            <div>
              <label className="label">Date de sortie</label>
              <input
                type="date"
                value={dateSortie}
                onChange={(e) => setDateSortie(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Kilométrage */}
          <div>
            <label className="label flex items-center justify-between">
              <span>Kilométrage sortie</span>
              {kmVehicule && (
                <span className="text-xs text-gray-400 font-normal">
                  Véhicule actuel :{" "}
                  <strong>{kmVehicule.toLocaleString("fr-FR")} km</strong>
                </span>
              )}
            </label>
            <input
              type="number"
              value={km}
              onChange={(e) => {
                setKm(e.target.value);
                setKmModifie(true);
              }}
              className={`input ${kmModifie && km !== String(kmInitial) ? "border-primary-400 bg-primary-50" : ""}`}
              min={0}
              placeholder={
                kmVehicule
                  ? `> ${kmVehicule.toLocaleString("fr-FR")} km`
                  : "ex : 125000"
              }
            />
            {kmModifie && km && kmVehicule && parseInt(km) > kmVehicule && (
              <p className="text-xs text-primary-600 mt-1">
                +{(parseInt(km) - kmVehicule).toLocaleString("fr-FR")} km depuis
                le dernier enregistrement
              </p>
            )}
            {kmModifie && km && kmVehicule && parseInt(km) < kmVehicule && (
              <p className="text-xs text-orange-500 mt-1">
                ⚠ Inférieur au kilométrage actuel du véhicule (
                {kmVehicule.toLocaleString("fr-FR")} km)
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Sera mis à jour sur la fiche véhicule si supérieur au kilométrage
              actuel.
            </p>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-700">
            Le prochain entretien kilométrique sera recalculé automatiquement.
          </div>

          <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn bg-success text-white hover:bg-success-dark gap-2"
            >
              {mutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" /> Clôture…
                </>
              ) : (
                <>
                  <Lock size={14} /> Clôturer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const maintenanceId = parseInt(id!);

  const [cloturerModal, setCloturerModal] = useState(false);
  const [approuverOpen, setApprouverOpen] = useState(false);

  const {
    data: maintenance,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["maintenance", maintenanceId],
    queryFn: () =>
      maintenancesApi
        .get(maintenanceId)
        .then((r) => r.data.data as Maintenance),
    enabled: !!maintenanceId,
  });

  const approuverMut = useMutation({
    mutationFn: () => maintenancesApi.approuver(maintenanceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", maintenanceId] });
      qc.invalidateQueries({ queryKey: ["maintenances"] });
      toast.success("Maintenance approuvée.");
      setApprouverOpen(false);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ?? "Erreur lors de l'approbation.",
      );
    },
  });

  if (isLoading)
    return (
      <div className="card p-6">
        <CardLoading rows={8} />
      </div>
    );
  if (error || !maintenance)
    return <ErrorState message="Maintenance non trouvée." onRetry={refetch} />;

  const peutApprouver =
    hasRole("super_admin", "directeur", "resp_parc") &&
    maintenance.necessite_approbation &&
    !maintenance.approuve_par;
  const peutCloturer =
    maintenance.statut !== "termine" && maintenance.statut !== "annule";
  const estTerminee = maintenance.statut === "termine";

  return (
    <div className="space-y-6 max-w-4xl">
      {cloturerModal && (
        <CloturerModal
          maintenance={maintenance}
          onClose={() => setCloturerModal(false)}
        />
      )}
      <ConfirmDialog
        open={approuverOpen}
        onClose={() => setApprouverOpen(false)}
        onConfirm={() => approuverMut.mutate()}
        loading={approuverMut.isPending}
        title="Approuver la maintenance"
        message={`Confirmer l'approbation de « ${maintenance.titre} » pour ${formatCfa(maintenance.montant_ttc)} ?`}
        confirmLabel="Approuver"
        variant="info"
      />

      <PageHeader
        title={maintenance.titre}
        subtitle={`${getTypeOperationLabel(maintenance.type_operation)} · ${maintenance.vehicule?.immatriculation ?? "—"}`}
        backTo={
          maintenance.vehicule_id
            ? `/vehicules/${maintenance.vehicule_id}`
            : "/maintenances"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {peutApprouver && (
              <button
                onClick={() => setApprouverOpen(true)}
                className="btn bg-blue-600 text-white hover:bg-blue-700 gap-2"
              >
                <CheckCircle size={15} /> Approuver
              </button>
            )}
            {peutCloturer && (
              <button
                onClick={() => setCloturerModal(true)}
                className="btn-primary gap-2"
              >
                <Lock size={15} /> Clôturer
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatutMaintenanceBadge statut={maintenance.statut} />
        {maintenance.necessite_approbation && !maintenance.approuve_par && (
          <span className="badge badge-warning">En attente d'approbation</span>
        )}
        {maintenance.necessite_approbation && maintenance.approuve_par && (
          <span className="badge badge-success">
            Approuvée par {maintenance.approuve_par}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="section-title">Détails de l'intervention</h3>
          <dl className="space-y-3">
            {(
              [
                ["Type", getTypeOperationLabel(maintenance.type_operation)],
                ["Catégorie", maintenance.categorie_travaux],
                [
                  "Véhicule",
                  maintenance.vehicule
                    ? `${maintenance.vehicule.immatriculation} — ${maintenance.vehicule.marque} ${maintenance.vehicule.modele}`
                    : "—",
                ],
                ["Kilométrage", formatKm(maintenance.kilometrage)],
                ["Date travaux", formatDate(maintenance.date_travaux)],
                ["Date entrée", formatDate(maintenance.date_entree)],
                ["Date sortie", formatDate(maintenance.date_sortie)],
                ["Fournisseur", maintenance.fournisseur?.nom],
                ["Chauffeur", maintenance.chauffeur?.nom],
              ] as [string, string | null | undefined][]
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-sm text-gray-500 flex-shrink-0">{label}</dt>
                <dd className="text-sm font-medium text-gray-900 text-right">
                  {value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card p-6">
          <h3 className="section-title">Informations financières</h3>
          <dl className="space-y-3">
            {(
              [
                ["Montant HT", formatCfa(maintenance.montant_ht), false],
                ["TVA", maintenance.tva ? `${maintenance.tva}%` : "—", false],
                ["Montant TTC", formatCfa(maintenance.montant_ttc), true],
                ["N° facture", maintenance.numero_facture, false],
                ["Date facture", formatDate(maintenance.date_facture), false],
              ] as [string, string | null | undefined, boolean][]
            ).map(([label, value, highlight]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-sm text-gray-500 flex-shrink-0">{label}</dt>
                <dd
                  className={`text-sm text-right font-medium ${highlight ? "text-primary-700 font-bold text-base" : "text-gray-900"}`}
                >
                  {value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
          {maintenance.necessite_approbation && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-700">
              Montant supérieur au seuil — nécessite validation directeur
            </div>
          )}
        </div>
      </div>

      {maintenance.description_travaux && (
        <div className="card p-6">
          <h3 className="section-title">Description des travaux</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {maintenance.description_travaux}
          </p>
        </div>
      )}

      {maintenance.notes && (
        <div className="card p-6">
          <h3 className="section-title">Notes</h3>
          <p className="text-sm text-gray-600 italic">{maintenance.notes}</p>
        </div>
      )}

      {estTerminee && (
        <div className="card p-6 border-success bg-green-50">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-success" />
            <h3 className="font-semibold text-success">Maintenance clôturée</h3>
          </div>
          <p className="text-sm text-gray-600">
            Sortie le {formatDate(maintenance.date_sortie)} ·{" "}
            {formatKm(maintenance.kilometrage)} · Montant final :{" "}
            <strong>{formatCfa(maintenance.montant_ttc)}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
