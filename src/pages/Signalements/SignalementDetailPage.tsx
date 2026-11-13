import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, Wrench, Camera } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signalementsApi } from "@/api/operations.api";
import PageHeader from "@/components/shared/PageHeader";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import CreerMaintenanceModal from "@/components/shared/CreerMaintenanceModal";
import {
  CardLoading,
  ErrorState,
  LoadingSpinner,
} from "@/components/shared/LoadingPage";
import { GraviteBadge } from "@/components/shared/StatutBadge";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatKm, mediaUrl } from "@/utils";
import toast from "react-hot-toast";

// ── Statut badge ──────────────────────────────────────────────
function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    nouveau: "badge-danger",
    en_cours: "badge-warning",
    maintenance_creee: "badge-info",
    resolu: "badge-success",
  };
  return (
    <span className={`badge ${map[statut] ?? "badge-gray"}`}>
      {statut.replace(/_/g, " ")}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function SignalementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole, role } = useAuthStore();
  const sigId = parseInt(id!);
  const isChauffeur = role === "chauffeur";

  const [pecOpen, setPecOpen] = useState(false);
  const [resoudreOpen, setResoudreOpen] = useState(false);
  const [maintModal, setMaintModal] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const {
    data: s,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["signalement", sigId],
    queryFn: () => signalementsApi.get(sigId).then((r) => r.data.data),
  });

  // Prise en charge
  const pecMut = useMutation({
    mutationFn: () => signalementsApi.prendreEnCharge(sigId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signalement", sigId] });
      qc.invalidateQueries({ queryKey: ["signalements"] });
      toast.success("Prise en charge enregistrée.");
      setPecOpen(false);
    },
  });

  // Résolution
  const resoudreMut = useMutation({
    mutationFn: () =>
      signalementsApi.resoudre(sigId, { commentaire_resolution: commentaire }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signalement", sigId] });
      qc.invalidateQueries({ queryKey: ["signalements"] });
      toast.success("Signalement résolu.");
      setResoudreOpen(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  // Upload photos par le chauffeur
  const uploadMut = useMutation({
    mutationFn: (fd: FormData) => signalementsApi.uploadPhotos(sigId, fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signalement", sigId] });
      toast.success("Photo(s) ajoutée(s).");
      setPhotoFiles([]);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const handleUploadPhotos = () => {
    if (!photoFiles.length) return;
    const fd = new FormData();
    photoFiles.forEach((f) => fd.append("photos[]", f, f.name));
    uploadMut.mutate(fd);
  };

  if (isLoading)
    return (
      <div className="card p-6">
        <CardLoading rows={8} />
      </div>
    );
  if (error || !s)
    return <ErrorState message="Signalement non trouvé." onRetry={refetch} />;

  const peutPrendreEnCharge =
    s.statut === "nouveau" &&
    hasRole("super_admin", "directeur", "resp_parc", "resp_agence");
  const peutResoudre =
    ["nouveau", "en_cours", "maintenance_creee"].includes(s.statut) &&
    hasRole("super_admin", "directeur", "resp_parc", "resp_agence");
  const peutCreerMaintenance =
    s.statut !== "resolu" &&
    s.maintenance_id == null &&
    hasRole("super_admin", "directeur", "resp_parc", "resp_agence");
  const peutAjouterPhotos =
    isChauffeur && ["nouveau", "en_cours"].includes(s.statut);
  const maintenanceTerminee =
    s.statut === "maintenance_creee" && s.maintenance_id;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Modaux */}
      {maintModal && (
        <CreerMaintenanceModal
          signalement={s}
          onClose={() => setMaintModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["signalement", sigId] });
          }}
        />
      )}

      {/* Confirmations */}
      <ConfirmDialog
        open={pecOpen}
        onClose={() => setPecOpen(false)}
        onConfirm={() => pecMut.mutate()}
        loading={pecMut.isPending}
        title="Prendre en charge"
        message={`Confirmer la prise en charge de : "${s.titre}" ?`}
        confirmLabel="Prendre en charge"
        variant="info"
      />

      {/* Résolution modal */}
      {resoudreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setResoudreOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-3">Résoudre le signalement</h3>
            <div>
              <label className="label">Commentaire de résolution *</label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={4}
                className="input resize-none"
                placeholder="Décrivez la résolution appliquée…"
              />
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setResoudreOpen(false)}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={() => resoudreMut.mutate()}
                disabled={!commentaire.trim() || resoudreMut.isPending}
                className="btn bg-success text-white hover:opacity-90 gap-2"
              >
                {resoudreMut.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <CheckCircle size={14} /> Résoudre
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <PageHeader
        title={s.titre}
        subtitle={`${s.vehicule?.immatriculation ?? "—"} · ${formatDate(s.date_signalement)}`}
        backTo="/signalements"
        actions={
          <div className="flex gap-2 flex-wrap">
            {peutPrendreEnCharge && (
              <button
                onClick={() => setPecOpen(true)}
                className="btn-secondary gap-2"
              >
                <Wrench size={15} /> Prendre en charge
              </button>
            )}
            {peutResoudre && (
              <button
                onClick={() => setResoudreOpen(true)}
                className="btn bg-success text-white hover:opacity-90 gap-2"
              >
                <CheckCircle size={15} /> Résoudre
              </button>
            )}
            {peutCreerMaintenance && (
              <button
                onClick={() => setMaintModal(true)}
                className="btn-warning gap-2"
              >
                <Wrench size={15} /> Créer maintenance
              </button>
            )}
          </div>
        }
      />

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <StatutBadge statut={s.statut} />
        <GraviteBadge gravite={s.gravite} />
        <span className="badge badge-gray capitalize">
          {s.type_defaut?.replace(/_/g, " ")}
        </span>
        {s.maintenance_id && (
          <button
            onClick={() => navigate(`/maintenances/${s.maintenance_id}`)}
            className="badge badge-info hover:opacity-80 cursor-pointer"
          >
            🔧 Maintenance liée →
          </button>
        )}
      </div>

      {/* Maintenance terminée — invitation à résoudre */}
      {maintenanceTerminee && !isChauffeur && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-green-700">
                Maintenance liée terminée
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                La maintenance #{s.maintenance_id} est clôturée. Vous pouvez
                maintenant résoudre ce signalement.
              </p>
            </div>
          </div>
          <button
            onClick={() => setResoudreOpen(true)}
            className="btn bg-success text-white hover:opacity-90 gap-2 flex-shrink-0"
          >
            <CheckCircle size={15} /> Résoudre
          </button>
        </div>
      )}

      {/* Alerte chauffeur — suivi statut */}
      {isChauffeur && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            s.statut === "resolu"
              ? "bg-green-50 border-green-200"
              : s.statut === "en_cours"
                ? "bg-yellow-50 border-yellow-200"
                : s.statut === "maintenance_creee"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-red-50 border-red-200"
          }`}
        >
          <span className="text-xl flex-shrink-0">
            {s.statut === "resolu"
              ? "✅"
              : s.statut === "en_cours"
                ? "🔧"
                : s.statut === "maintenance_creee"
                  ? "🏗"
                  : "🔴"}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {s.statut === "resolu"
                ? "Votre signalement a été résolu"
                : s.statut === "en_cours"
                  ? "Votre signalement est pris en charge"
                  : s.statut === "maintenance_creee"
                    ? "Une maintenance a été programmée"
                    : "Votre signalement est en attente de traitement"}
            </p>
            {s.statut === "resolu" && s.commentaire_resolution && (
              <p className="text-sm text-gray-600 mt-1">
                {s.commentaire_resolution}
              </p>
            )}
          </div>
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
                s.vehicule
                  ? `${s.vehicule.immatriculation} — ${s.vehicule.marque} ${s.vehicule.modele}`
                  : "—",
              ],
              ["Kilométrage", formatKm(s.kilometrage)],
              ...(!isChauffeur ? [["Chauffeur", s.chauffeur?.nom ?? "—"]] : []),
              ["Date", formatDate(s.date_signalement)],
              ["Pris en charge", s.pris_en_charge_par ?? "—"],
              ["Date PEC", formatDate(s.pris_en_charge_le)],
              ["Résolu par", s.resolu_par ?? "—"],
              ["Date résolution", formatDate(s.resolu_le)],
            ]
              .filter(
                ([, v]) =>
                  (v !== null && v !== "—") ||
                  ["Véhicule", "Kilométrage", "Date"].includes(String(v)),
              )
              .map(([l, v]) => (
                <div
                  key={l as string}
                  className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"
                >
                  <dt className="text-gray-500">{l}</dt>
                  <dd className="font-medium text-gray-900 text-right ml-4">
                    {(v as string) ?? "—"}
                  </dd>
                </div>
              ))}
          </dl>
        </div>

        {/* Description + résolution */}
        <div className="card p-5 space-y-4">
          <div>
            <h3 className="section-title">Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {s.description}
            </p>
          </div>
          {s.commentaire_resolution && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
              <p className="text-xs font-semibold text-green-600 mb-1 uppercase tracking-wide">
                Commentaire de résolution
              </p>
              <p className="text-sm text-green-800 whitespace-pre-line">
                {s.commentaire_resolution}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Photos */}
      {(s.photos?.length > 0 || peutAjouterPhotos) && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title mb-0 border-0 pb-0">
              Photos ({s.photos?.length ?? 0})
            </h3>
            {peutAjouterPhotos && (
              <label className="btn-secondary btn-sm gap-1.5 cursor-pointer">
                <Camera size={14} /> Ajouter
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []).slice(0, 5);
                    setPhotoFiles(files);
                  }}
                />
              </label>
            )}
          </div>

          {/* Photos existantes */}
          {s.photos?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {s.photos.map((p: any) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  title={p.nom}
                >
                  <img
                    src={p.url}
                    alt={p.nom}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-zoom-in"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Nouvelles photos à uploader */}
          {photoFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {photoFiles.map((f, i) => (
                  <div key={i} className="relative">
                    <img
                      src={URL.createObjectURL(f)}
                      alt={f.name}
                      className="w-16 h-16 object-cover rounded-lg border-2 border-primary-300"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUploadPhotos}
                disabled={uploadMut.isPending}
                className="btn-primary btn-sm gap-2"
              >
                {uploadMut.isPending ? (
                  <>
                    <LoadingSpinner size="sm" /> Upload…
                  </>
                ) : (
                  <>
                    <Camera size={13} /> Envoyer {photoFiles.length} photo(s)
                  </>
                )}
              </button>
            </div>
          )}

          {s.photos?.length === 0 && !peutAjouterPhotos && (
            <p className="text-sm text-gray-400">Aucune photo jointe.</p>
          )}
        </div>
      )}
    </div>
  );
}
