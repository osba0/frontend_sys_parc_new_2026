import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Send, Package, FileDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bonsCommandeApi, rapportsApi } from "@/api/finance.api";
import PageHeader from "@/components/shared/PageHeader";
import {
  CardLoading,
  ErrorState,
  LoadingSpinner,
} from "@/components/shared/LoadingPage";
import { StatutBCBadge } from "@/components/shared/StatutBadge";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatCfa, downloadBlob } from "@/utils";
import toast from "react-hot-toast";

export default function BonCommandeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const bcId = parseInt(id!);

  const [approuverOpen, setApprouverOpen] = useState(false);
  const [executerOpen, setExecuterOpen] = useState(false);
  const [rejeterOpen, setRejeterOpen] = useState(false);
  const [motifRejet, setMotifRejet] = useState("");
  const [dateLivraison, setDateLivraison] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const {
    data: bc,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["bon-commande", bcId],
    queryFn: () => bonsCommandeApi.get(bcId).then((r) => r.data.data),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["bon-commande", bcId] });

  const soumettreMut = useMutation({
    mutationFn: () => bonsCommandeApi.soumettre(bcId),
    onSuccess: () => {
      invalidate();
      toast.success("BC soumis pour approbation.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });
  const approuverMut = useMutation({
    mutationFn: () => bonsCommandeApi.approuver(bcId),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["bons-commande"] });
      toast.success("Bon de commande approuvé.");
      setApprouverOpen(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });
  const rejeterMut = useMutation({
    mutationFn: () => bonsCommandeApi.rejeter(bcId, { motif: motifRejet }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["bons-commande"] });
      toast.success("Bon de commande rejeté.");
      setRejeterOpen(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });
  const executerMut = useMutation({
    mutationFn: () =>
      bonsCommandeApi.executer(bcId, { date_livraison_reelle: dateLivraison }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["bons-commande"] });
      toast.success("BC marqué comme exécuté.");
      setExecuterOpen(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const handlePdf = async () => {
    try {
      const res = await rapportsApi.pdfBonCommande(bcId);
      downloadBlob(res.data as Blob, `BC_${bc?.numero_bc}.pdf`);
    } catch {
      toast.error("Erreur génération PDF.");
    }
  };

  if (isLoading)
    return (
      <div className="card p-6">
        <CardLoading rows={6} />
      </div>
    );
  if (error || !bc)
    return (
      <ErrorState message="Bon de commande non trouvé." onRetry={refetch} />
    );

  const peutSoumettre = bc.statut === "brouillon";
  const peutModifier =
    ["brouillon", "rejete"].includes(bc.statut) &&
    hasRole(
      "super_admin",
      "directeur",
      "resp_parc",
      "resp_agence",
      "comptable",
    );
  const peutApprouver =
    bc.statut === "soumis" && hasRole("super_admin", "directeur");
  const peutRejeter =
    bc.statut === "soumis" && hasRole("super_admin", "directeur");
  const peutExecuter =
    bc.statut === "approuve" &&
    hasRole("super_admin", "directeur", "resp_parc", "resp_agence");

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Dialogues */}
      <ConfirmDialog
        open={approuverOpen}
        onClose={() => setApprouverOpen(false)}
        onConfirm={() => approuverMut.mutate()}
        loading={approuverMut.isPending}
        title="Approuver le bon de commande"
        message={`Confirmer l'approbation de ${bc.numero_bc} pour ${formatCfa(bc.montant_ttc)} ?`}
        confirmLabel="Approuver"
        variant="info"
      />
      <ConfirmDialog
        open={executerOpen}
        onClose={() => setExecuterOpen(false)}
        onConfirm={() => executerMut.mutate()}
        loading={executerMut.isPending}
        title="Marquer comme exécuté"
        message={
          <div className="space-y-3">
            <p>
              La livraison a été reçue pour <strong>{bc.numero_bc}</strong> ?
            </p>
            <div>
              <label className="label text-sm">Date de livraison réelle</label>
              <input
                type="date"
                value={dateLivraison}
                onChange={(e) => setDateLivraison(e.target.value)}
                className="input"
              />
            </div>
          </div>
        }
        confirmLabel="Marquer exécuté"
        variant="info"
      />

      {/* Modal rejet */}
      {rejeterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setRejeterOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-lg mb-3">
              Rejeter le bon de commande
            </h3>
            <div>
              <label className="label">Motif du rejet *</label>
              <textarea
                value={motifRejet}
                onChange={(e) => setMotifRejet(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Expliquez la raison du rejet (min 10 caractères)…"
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
                disabled={motifRejet.trim().length < 10 || rejeterMut.isPending}
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

      {/* Header */}
      <PageHeader
        title={bc.numero_bc}
        subtitle={`${bc.fournisseur?.nom ?? "Sans fournisseur"} · ${bc.agence?.nom ?? "—"}`}
        backTo="/bons-commande"
        actions={
          <div className="flex gap-2 flex-wrap">
            {peutModifier && (
              <button
                onClick={() => navigate(`/bons-commande/${bcId}/modifier`)}
                className="btn-secondary gap-2"
              >
                ✏ Modifier
              </button>
            )}
            {peutSoumettre && (
              <button
                onClick={() => soumettreMut.mutate()}
                disabled={soumettreMut.isPending}
                className="btn-secondary gap-2"
              >
                {soumettreMut.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Send size={14} /> Soumettre
                  </>
                )}
              </button>
            )}
            {peutApprouver && (
              <button
                onClick={() => setApprouverOpen(true)}
                className="btn-primary gap-2"
              >
                <CheckCircle size={14} /> Approuver
              </button>
            )}
            {peutRejeter && (
              <button
                onClick={() => setRejeterOpen(true)}
                className="btn-danger gap-2"
              >
                <XCircle size={14} /> Rejeter
              </button>
            )}
            {peutExecuter && (
              <button
                onClick={() => setExecuterOpen(true)}
                className="btn bg-success text-white hover:opacity-90 gap-2"
              >
                <Package size={14} /> Livraison reçue
              </button>
            )}
            <button onClick={handlePdf} className="btn-secondary gap-2">
              <FileDown size={14} /> PDF
            </button>
          </div>
        }
      />

      {/* Badges */}
      <div className="flex gap-2 flex-wrap">
        <StatutBCBadge statut={bc.statut} />
        {bc.vehicule && (
          <span
            className="badge badge-info cursor-pointer hover:opacity-80"
            onClick={() => navigate(`/vehicules/${bc.vehicule!.id}`)}
          >
            🚗 {bc.vehicule.immatriculation}
          </span>
        )}
      </div>

      {/* Motif rejet */}
      {bc.motif_rejet && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Motif de rejet</p>
            <p className="text-sm text-red-600 mt-0.5">{bc.motif_rejet}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Informations */}
        <div className="card p-5">
          <h3 className="section-title">Informations</h3>
          <dl className="space-y-2">
            {[
              ["Agence", bc.agence?.nom],
              ["Fournisseur", bc.fournisseur?.nom],
              ["Véhicule", bc.vehicule?.immatriculation],
              ["Date commande", formatDate(bc.date_commande)],
              ["Livraison prévue", formatDate(bc.date_livraison_prevue)],
              ["Livraison réelle", formatDate(bc.date_livraison_reelle)],
              ["Créé par", bc.cree_par],
              ["Approuvé par", bc.approuve_par],
              ["Date approbation", formatDate(bc.approuve_le)],
            ]
              .filter(([, v]) => !!v)
              .map(([l, v]) => (
                <div
                  key={l as string}
                  className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0"
                >
                  <dt className="text-gray-500">{l}</dt>
                  <dd className="font-medium text-right ml-4">{v as string}</dd>
                </div>
              ))}
          </dl>
        </div>

        {/* Montants */}
        <div className="card p-5">
          <h3 className="section-title">Montants</h3>
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Total HT</dt>
              <dd className="font-medium">{formatCfa(bc.montant_ht)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">TVA ({bc.tva ?? 0}%)</dt>
              <dd className="font-medium">
                {formatCfa((bc.montant_ttc ?? 0) - (bc.montant_ht ?? 0))}
              </dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <dt className="font-bold text-primary-700">Total TTC</dt>
              <dd className="font-bold text-primary-700 text-xl">
                {formatCfa(bc.montant_ttc)}
              </dd>
            </div>
          </dl>

          {bc.observations && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-medium uppercase mb-1">
                Observations
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {bc.observations}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lignes */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">
            Lignes de commande ({bc.lignes?.length ?? 0})
          </h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th className="w-8">#</th>
              <th>Description</th>
              <th className="text-right w-20">Qté</th>
              <th className="w-16">Unité</th>
              <th className="text-right w-32">P.U.</th>
              <th className="text-right w-36">Total</th>
            </tr>
          </thead>
          <tbody>
            {(bc.lignes ?? []).map((l: any, i: number) => (
              <tr key={i}>
                <td className="text-gray-400 text-xs">{i + 1}</td>
                <td>{l.description}</td>
                <td className="text-right font-mono">{l.quantite}</td>
                <td className="text-gray-500 text-sm">{l.unite ?? "—"}</td>
                <td className="text-right font-mono">
                  {formatCfa(l.prix_unitaire)}
                </td>
                <td className="text-right font-semibold">
                  {formatCfa(l.total ?? l.quantite * l.prix_unitaire)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td
                colSpan={5}
                className="text-right font-bold text-primary-700 py-3"
              >
                Total TTC
              </td>
              <td className="text-right font-bold text-primary-700 text-lg py-3">
                {formatCfa(bc.montant_ttc)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
