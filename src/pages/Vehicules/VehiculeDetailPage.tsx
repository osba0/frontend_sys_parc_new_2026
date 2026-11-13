import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Edit,
  Car,
  FileText,
  Wrench,
  Fuel,
  ClipboardCheck,
  Heart,
  AlertTriangle,
  ArrowLeftRight,
  TrendingUp,
  Printer,
  Gauge,
  Plus,
  Upload,
  RefreshCw,
  Trash2,
  ExternalLink,
  Eye,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Lock,
  Image as ImageIcon,
  CircleDot,
} from "lucide-react";
import { useVehicule, useUpdateKilometrage } from "@/hooks";
import PageHeader from "@/components/shared/PageHeader";
import {
  CardLoading,
  EmptyState,
  ErrorState,
  LoadingSpinner,
} from "@/components/shared/LoadingPage";
import {
  StatutDocumentBadge,
  StatutMaintenanceBadge,
  StatutVehiculeBadge,
  TypeVehiculeBadge,
  TypeOperationPneuBadge,
} from "@/components/shared/StatutBadge";
import VehiculePhotos from "@/components/shared/VehiculePhotos";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useAuthStore } from "@/stores/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vehiculesApi } from "@/api/vehicules.api";
import {
  checklistsApi,
  signalementsApi,
  affectationsApi,
  chauffeursApi,
} from "@/api/operations.api";
import {
  documentsApi,
  rapportsApi,
  maintenancesApi,
  fournisseursApi,
  carburantApi,
} from "@/api/finance.api";
import { pneumatiquesApi } from "@/api/pneumatiques.api";
import {
  getPrixDefaut,
  calculerMontant,
  calculerPrixUnitaire,
  PRIX_CARBURANT_DEFAUT,
} from "@/config/carburantConfig";
import CreerMaintenanceModal from "@/components/shared/CreerMaintenanceModal";
import {
  downloadBlob,
  formatCfa,
  formatDate,
  formatKm,
  getTypeDocumentLabel,
  getTypeOperationLabel,
  mediaUrl,
} from "@/utils";
import type { TypeDocument } from "@/types";
import toast from "react-hot-toast";
import PlaqueSN from "@/components/shared/PlaqueSN";

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const TABS = [
  { key: "info", label: "Détails", icon: <Car size={14} /> },
  { key: "photos", label: "Photos", icon: <ImageIcon size={14} /> },
  { key: "documents", label: "Documents", icon: <FileText size={14} /> },
  { key: "maintenances", label: "Maintenance", icon: <Wrench size={14} /> },
  { key: "carburant", label: "Carburant", icon: <Fuel size={14} /> },
  { key: "pneumatiques", label: "Pneumatiques", icon: <CircleDot size={14} /> },
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
  {
    key: "affectations",
    label: "Affectations",
    icon: <ArrowLeftRight size={14} />,
  },
  { key: "tco", label: "TCO", icon: <TrendingUp size={14} /> },
];

const TYPES_DOCUMENT: { value: TypeDocument; label: string; icon: string }[] = [
  { value: "carte_grise", label: "Carte grise", icon: "🪪" },
  { value: "assurance", label: "Assurance", icon: "🛡️" },
  { value: "visite_technique", label: "Visite technique", icon: "🔧" },
  {
    value: "autorisation_circulation",
    label: "Autorisation circulation",
    icon: "📋",
  },
  { value: "carte_carburant", label: "Carte carburant", icon: "⛽" },
  { value: "autre", label: "Autre document", icon: "📄" },
];

// ─────────────────────────────────────────────────────────────
// Modal — Visualisation de document
// ─────────────────────────────────────────────────────────────

interface ViewerModalProps {
  url: string;
  nom: string | null;
  type: string;
  onClose: () => void;
}

function DocumentViewerModal({ url, nom, type, onClose }: ViewerModalProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Détecter si c'est un PDF ou une image
  const isPdf =
    url.toLowerCase().includes(".pdf") ||
    nom?.toLowerCase().endsWith(".pdf") ||
    false;

  const typeLabel =
    TYPES_DOCUMENT.find((t) => t.value === type)?.label ??
    type.replace(/_/g, " ");

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = nom ?? "document";
    a.target = "_blank";
    a.click();
  };

  // Fermer sur Escape
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      onKeyDown={handleKey}
      tabIndex={-1}
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Container modal */}
      <div className="relative flex flex-col w-full h-full max-w-5xl mx-auto my-4 rounded-2xl overflow-hidden shadow-2xl">
        {/* ── Barre d'outils ── */}
        <div className="relative bg-gray-900 flex items-center justify-between px-4 py-3 flex-shrink-0 z-10">
          {/* Titre */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl">
              {TYPES_DOCUMENT.find((t) => t.value === type)?.icon ?? "📄"}
            </span>
            <div className="min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {typeLabel}
              </p>
              {nom && <p className="text-gray-400 text-xs truncate">{nom}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Zoom — uniquement pour les images */}
            {!isPdf && (
              <>
                <button
                  onClick={() => setZoom((z) => Math.max(25, z - 25))}
                  disabled={zoom <= 25}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-30"
                  title="Réduire"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-gray-400 text-xs w-12 text-center select-none">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(300, z + 25))}
                  disabled={zoom >= 300}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-30"
                  title="Agrandir"
                >
                  <ZoomIn size={16} />
                </button>

                <div className="w-px h-5 bg-gray-700 mx-1" />

                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  title="Pivoter"
                >
                  <RotateCw size={16} />
                </button>

                <div className="w-px h-5 bg-gray-700 mx-1" />
              </>
            )}

            {/* Ouvrir dans un nouvel onglet */}
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Ouvrir dans un nouvel onglet"
            >
              <ExternalLink size={16} />
            </a>

            {/* Télécharger */}
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Télécharger"
            >
              <Download size={16} />
            </button>

            <div className="w-px h-5 bg-gray-700 mx-1" />

            {/* Fermer */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-red-600 transition-colors"
              title="Fermer (Échap)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Zone de visualisation ── */}
        <div className="relative flex-1 bg-gray-800 overflow-auto flex items-center justify-center">
          {isPdf ? (
            // PDF — iframe natif du navigateur
            <iframe
              src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0"
              title={nom ?? "Document PDF"}
            />
          ) : (
            // Image — avec zoom et rotation
            <div className="overflow-auto flex items-center justify-center w-full h-full p-4">
              <img
                src={url}
                alt={nom ?? typeLabel}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center",
                  transition: "transform 0.2s ease",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "8px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "";
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement!.innerHTML =
                    '<p style="color:#9ca3af;text-align:center">Impossible d\'afficher ce fichier.</p>';
                }}
              />
            </div>
          )}
        </div>

        {/* ── Barre statut ── */}
        <div className="relative bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <span className="text-gray-500 text-xs">
            {isPdf
              ? "PDF — défilement et zoom natifs du navigateur"
              : `Image — zoom ${zoom}% · rotation ${rotation}°`}
          </span>
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal — Ajout de document
// ─────────────────────────────────────────────────────────────

interface DocumentModalProps {
  vehiculeId: number;
  agenceId: number;
  onClose: () => void;
}

function DocumentModal({ vehiculeId, agenceId, onClose }: DocumentModalProps) {
  const qc = useQueryClient();
  const [type, setType] = useState<TypeDocument>("carte_grise");
  const [numero, setNumero] = useState("");
  const [organisme, setOrganisme] = useState("");
  const [emission, setEmission] = useState("");
  const [expiration, setExpiration] = useState("");
  const [notes, setNotes] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const mutation = useMutation({
    mutationFn: (fd: FormData) => documentsApi.create(fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v-docs", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["vehicule", vehiculeId] });
      toast.success("Document ajouté avec succès.");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'ajout.");
    },
  });

  const handleFile = (f: File | null) => {
    if (!f) return;
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowed.includes(f.type)) {
      toast.error("Format non supporté. Utilisez PDF, JPG ou PNG.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    setFichier(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("vehicule_id", String(vehiculeId));
    fd.append("agence_id", String(agenceId));
    fd.append("type_document", type);
    if (numero) fd.append("numero", numero);
    if (organisme) fd.append("organisme_emetteur", organisme);
    if (emission) fd.append("date_emission", emission);
    if (expiration) fd.append("date_expiration", expiration);
    if (notes) fd.append("notes", notes);
    if (fichier) fd.append("fichier", fichier);
    mutation.mutate(fd);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Ajouter un document
            </h3>
            <p className="text-primary-200 text-xs mt-0.5">
              Un document existant du même type sera automatiquement archivé
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-primary-200 hover:text-white transition-colors text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Corps scrollable */}
        <form
          onSubmit={handleSubmit}
          id="doc-form"
          className="overflow-y-auto flex-1 p-6 space-y-5"
        >
          {/* Sélecteur type */}
          <div>
            <label className="label">Type de document *</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES_DOCUMENT.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                    type === t.value
                      ? "border-primary-600 bg-primary-50 text-primary-700 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Numéro + Organisme */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Numéro du document</label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="input"
                placeholder="Ex : SN-2024-001"
              />
            </div>
            <div>
              <label className="label">Organisme émetteur</label>
              <input
                value={organisme}
                onChange={(e) => setOrganisme(e.target.value)}
                className="input"
                placeholder="SONAM, DGTT…"
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

          {/* Upload fichier */}
          <div>
            <label className="label">
              Fichier scanné (PDF, JPG, PNG — max 10 Mo)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files[0] ?? null);
              }}
              onClick={() => document.getElementById("doc-file-input")?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-primary-400 bg-primary-50"
                  : fichier
                    ? "border-green-400 bg-green-50"
                    : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
              }`}
            >
              {fichier ? (
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <FileText size={18} />
                  <span className="text-sm font-medium max-w-xs truncate">
                    {fichier.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFichier(null);
                    }}
                    className="ml-1 text-red-400 hover:text-red-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    Glisser-déposer ou{" "}
                    <span className="text-primary-600 font-medium">
                      parcourir
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF · JPG · PNG · max 10 Mo
                  </p>
                </>
              )}
            </div>
            <input
              id="doc-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Remarques, observations…"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap gap-3 justify-end flex-shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            type="submit"
            form="doc-form"
            disabled={mutation.isPending}
            className="btn-primary gap-2"
          >
            {mutation.isPending ? (
              <>
                <LoadingSpinner size="sm" /> Enregistrement…
              </>
            ) : (
              <>
                <Plus size={15} /> Ajouter le document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal — Renouvellement de document
// ─────────────────────────────────────────────────────────────

interface RenouvelerModalProps {
  document: {
    id: number;
    vehicule_id: number;
    type_document: string;
    numero: string | null;
    organisme_emetteur: string | null;
  };
  onClose: () => void;
}

function RenouvelerModal({ document: doc, onClose }: RenouvelerModalProps) {
  const qc = useQueryClient();
  const [numero, setNumero] = useState(doc.numero ?? "");
  const [organisme, setOrganisme] = useState(doc.organisme_emetteur ?? "");
  const [emission, setEmission] = useState("");
  const [expiration, setExpiration] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (fd: FormData) => documentsApi.renouveler(doc.id, fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v-docs", doc.vehicule_id] });
      qc.invalidateQueries({ queryKey: ["vehicule", doc.vehicule_id] });
      toast.success("Document renouvelé. L'ancien a été archivé.");
      onClose();
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ?? "Erreur lors du renouvellement.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("date_emission", emission);
    fd.append("date_expiration", expiration);
    if (numero) fd.append("numero", numero);
    if (organisme) fd.append("organisme_emetteur", organisme);
    if (notes) fd.append("notes", notes);
    if (fichier) fd.append("fichier", fichier);
    mutation.mutate(fd);
  };

  const typeLabel =
    TYPES_DOCUMENT.find((t) => t.value === doc.type_document)?.label ??
    doc.type_document.replace(/_/g, " ");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-warning rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">
              Renouveler — {typeLabel}
            </h3>
            <p className="text-yellow-100 text-xs mt-0.5">
              L'ancien document sera archivé automatiquement
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-yellow-100 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Numéro</label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Organisme</label>
              <input
                value={organisme}
                onChange={(e) => setOrganisme(e.target.value)}
                className="input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date d'émission *</label>
              <input
                type="date"
                value={emission}
                onChange={(e) => setEmission(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Date d'expiration *</label>
              <input
                type="date"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Nouveau fichier scanné (optionnel)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="input py-1.5 text-sm"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input resize-none"
            />
          </div>
          <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn bg-warning text-white hover:bg-warning-dark gap-2"
            >
              {mutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" /> Enregistrement…
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Renouveler
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
// Modal — Création de maintenance
// ─────────────────────────────────────────────────────────────

const TYPES_OPERATION = [
  { value: "entretien", label: "Entretien", icon: "🔧" },
  { value: "reparation", label: "Réparation", icon: "⚙️" },
  { value: "carrosserie", label: "Carrosserie", icon: "🚗" },
  { value: "visite_technique", label: "Visite technique", icon: "📋" },
  { value: "equipement", label: "Équipement", icon: "📦" },
  { value: "contravention", label: "Contravention", icon: "⚠️" },
] as const;

type TypeOperation = (typeof TYPES_OPERATION)[number]["value"];

interface MaintenanceModalProps {
  vehiculeId: number;
  agenceId: number;
  kmActuel: number;
  onClose: () => void;
}

function MaintenanceModal({
  vehiculeId,
  agenceId,
  kmActuel,
  onClose,
}: MaintenanceModalProps) {
  const qc = useQueryClient();

  // Champs obligatoires
  const [typeOp, setTypeOp] = useState<TypeOperation>("entretien");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [dateTravaux, setDateTravaux] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [km, setKm] = useState(String(kmActuel));

  // Champs optionnels
  const [fournisseurId, setFournisseurId] = useState("");
  const [categorie, setCategorie] = useState("");
  const [fournitures, setFournitures] = useState("");
  const [montantHt, setMontantHt] = useState("");
  const [tva, setTva] = useState("18");
  const [montantTtc, setMontantTtc] = useState("");
  const [noFacture, setNoFacture] = useState("");
  const [statut, setStatut] = useState<"planifie" | "en_cours">("en_cours");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Chargement des fournisseurs
  const { data: fournisseurs = [] } = useQuery({
    queryKey: ["fournisseurs-select"],
    queryFn: () =>
      fournisseursApi.list({ per_page: 200 }).then((r) => r.data.data as any[]),
    staleTime: 5 * 60 * 1000,
  });

  // Auto-calcul TTC
  const computedTtc =
    montantHt && tva
      ? Math.round(parseFloat(montantHt) * (1 + parseFloat(tva) / 100))
      : null;

  const ttcDisplay = montantTtc || (computedTtc ? String(computedTtc) : "");

  // Validation locale
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!titre.trim()) e.titre = "Titre obligatoire";
    if (!description.trim())
      e.description = "Description obligatoire (min 5 car.)";
    if (!dateTravaux) e.dateTravaux = "Date obligatoire";
    if (!km || parseInt(km) < 0) e.km = "Kilométrage obligatoire";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: (data: object) => maintenancesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v-maints", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["vehicule", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["maintenances"] });
      qc.invalidateQueries({ queryKey: ["maintenances-stats"] });
      import("react-hot-toast").then(({ default: toast }) =>
        toast.success("Maintenance enregistrée avec succès."),
      );
      onClose();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ?? "Erreur lors de l'enregistrement.";
      // Erreurs de validation Laravel (422)
      const laravelErrors = err?.response?.data?.errors as
        | Record<string, string[]>
        | undefined;
      if (laravelErrors) {
        const mapped: Record<string, string> = {};
        Object.entries(laravelErrors).forEach(([k, v]) => {
          mapped[k] = v[0];
        });
        setErrors(mapped);
      } else {
        setErrors({ _global: msg });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({
      vehicule_id: vehiculeId,
      agence_id: agenceId,
      type_operation: typeOp,
      titre: titre.trim(),
      description_travaux: description.trim(),
      date_travaux: dateTravaux,
      kilometrage: parseInt(km),
      statut,
      fournisseur_id: fournisseurId ? parseInt(fournisseurId) : null,
      categorie_travaux: categorie.trim() || null,
      fournitures_mo: fournitures.trim() || null,
      montant_ht: montantHt ? parseFloat(montantHt) : null,
      tva: tva ? parseFloat(tva) : null,
      montant_ttc: ttcDisplay ? parseFloat(ttcDisplay) : null,
      numero_facture: noFacture.trim() || null,
      notes: notes.trim() || null,
    });
  };

  const seuil = 500_000;
  const montantNum = parseFloat(ttcDisplay || "0");
  const necessitera = montantNum >= seuil;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Nouvelle maintenance
            </h3>
            <p className="text-primary-200 text-xs mt-0.5">
              {TYPES_OPERATION.find((t) => t.value === typeOp)?.icon}{" "}
              {TYPES_OPERATION.find((t) => t.value === typeOp)?.label}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-primary-200 hover:text-white transition-colors text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Corps scrollable */}
        <form
          id="maint-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-5"
        >
          {/* Erreur globale */}
          {errors._global && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors._global}
            </div>
          )}

          {/* Type d'opération */}
          <div>
            <label className="label">Type d'opération *</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPES_OPERATION.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTypeOp(t.value)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                    typeOp === t.value
                      ? "border-primary-600 bg-primary-50 text-primary-700 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="truncate w-full text-center">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Titre + Catégorie */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Titre de l'intervention *</label>
              <input
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className={`input ${errors.titre ? "input-error" : ""}`}
                placeholder="Ex : Vidange + filtre huile moteur"
              />
              {errors.titre && <p className="error-msg">{errors.titre}</p>}
            </div>
            <div>
              <label className="label">Catégorie</label>
              <input
                value={categorie}
                onChange={(e) => setCategorie(e.target.value)}
                className="input"
                placeholder="Vidange, freins, batterie…"
              />
            </div>
            <div>
              <label className="label">Statut</label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as any)}
                className="input"
              >
                <option value="planifie">Planifié</option>
                <option value="en_cours">En cours</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description des travaux *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`input resize-none ${errors.description ? "input-error" : ""}`}
              placeholder="Détail des opérations effectuées…"
            />
            {errors.description && (
              <p className="error-msg">{errors.description}</p>
            )}
          </div>

          {/* Fournitures */}
          <div>
            <label className="label">Fournitures & Main d'œuvre</label>
            <textarea
              value={fournitures}
              onChange={(e) => setFournitures(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="5L huile 5W40, filtre à huile réf. XXXX…"
            />
          </div>

          {/* Dates & Km */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date des travaux *</label>
              <input
                type="date"
                value={dateTravaux}
                onChange={(e) => setDateTravaux(e.target.value)}
                className={`input ${errors.dateTravaux ? "input-error" : ""}`}
              />
              {errors.dateTravaux && (
                <p className="error-msg">{errors.dateTravaux}</p>
              )}
            </div>
            <div>
              <label className="label">Kilométrage *</label>
              <input
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                className={`input ${errors.km ? "input-error" : ""}`}
                min={0}
                placeholder={String(kmActuel)}
              />
              {errors.km && <p className="error-msg">{errors.km}</p>}
            </div>
          </div>

          {/* Fournisseur + N° facture */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fournisseur / Garage</label>
              <select
                value={fournisseurId}
                onChange={(e) => setFournisseurId(e.target.value)}
                className="input"
              >
                <option value="">-- Sélectionner --</option>
                {fournisseurs.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">N° facture</label>
              <input
                value={noFacture}
                onChange={(e) => setNoFacture(e.target.value)}
                className="input"
                placeholder="FAC-2025-001"
              />
            </div>
          </div>

          {/* Finances */}
          <div>
            <label className="label">Informations financières</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label text-xs text-gray-400">
                  Montant HT (FCFA)
                </label>
                <input
                  type="number"
                  value={montantHt}
                  onChange={(e) => setMontantHt(e.target.value)}
                  className="input"
                  min={0}
                  step={100}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label text-xs text-gray-400">TVA (%)</label>
                <input
                  type="number"
                  value={tva}
                  onChange={(e) => setTva(e.target.value)}
                  className="input"
                  min={0}
                  max={100}
                  step={0.5}
                />
              </div>
              <div>
                <label className="label text-xs text-gray-400">
                  Montant TTC (FCFA)
                </label>
                <input
                  type="number"
                  value={montantTtc}
                  onChange={(e) => setMontantTtc(e.target.value)}
                  className="input"
                  min={0}
                  step={100}
                  placeholder={
                    computedTtc
                      ? computedTtc.toLocaleString("fr-SN")
                      : "Auto-calculé"
                  }
                />
              </div>
            </div>

            {/* Alerte seuil approbation */}
            {necessitera && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-700">
                <span>⚠️</span>
                <span>
                  Montant ≥ {seuil.toLocaleString("fr-SN")} FCFA — cette
                  maintenance nécessitera une approbation du directeur avant
                  clôture.
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Observations, recommandations…"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 rounded-b-2xl">
          <span className="text-xs text-gray-400">* Champs obligatoires</span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              form="maint-form"
              disabled={mutation.isPending}
              className="btn-primary gap-2"
            >
              {mutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" /> Enregistrement…
                </>
              ) : (
                <>
                  <Plus size={15} /> Enregistrer
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
// Modal — Nouvelle checklist (formulaire simplifié)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Structures data_json par type de checklist
// Format : { section: { item: valeur_par_defaut } }
// Valeurs possibles : 'ok' | 'moyen' | 'mauvais' | 'oui' | 'non' | 'na'
// ─────────────────────────────────────────────────────────────

const CHECKLIST_SECTIONS: Record<
  string,
  Record<string, Record<string, string>>
> = {
  hebdomadaire_vehicule: {
    Pneumatiques: { pneu_av: "ok", pneu_ar: "ok", pression: "ok" },
    Eclairage: {
      phare_av_g: "ok",
      phare_av_d: "ok",
      feu_stop: "ok",
      clignotant_avg: "ok",
      clignotant_avd: "ok",
      clignotant_arg: "ok",
      clignotant_ard: "ok",
    },
    Freinage: { frein_av: "ok", frein_ar: "ok" },
    Niveaux: { huile_moteur: "ok", liquide_refroid: "ok", lave_glace: "ok" },
    Carrosserie: {
      etat_carrosserie: "ok",
      retroviseur_g: "ok",
      retroviseur_d: "ok",
      pare_brise: "ok",
    },
    "Documents de bord": {
      carte_grise: "oui",
      assurance: "oui",
      extincteur: "oui",
      triangle: "oui",
    },
    Proprete: { interieur: "ok", exterieur: "ok" },
  },
  hebdomadaire_scooter: {
    Pneumatiques: { pneu_av: "ok", pneu_ar: "ok", pression: "ok" },
    Eclairage: { phare_av: "ok", feu_stop: "ok", clignotants: "ok" },
    Freinage: { frein_av: "ok", frein_ar: "ok" },
    Carenage: {
      carenage_av_g: "ok",
      carenage_av_d: "ok",
      carenage_ar_g: "ok",
      carenage_ar_d: "ok",
      garde_boue_av: "ok",
      garde_boue_ar: "ok",
      visiere: "ok",
    },
    Documents: {
      carte_grise: "oui",
      assurance: "oui",
      casque: "oui",
      gilet: "oui",
    },
    Proprete: { etat_general: "ok" },
  },
  visite_technique: {
    Moteur: {
      moteur: "ok",
      temperature: "ok",
      huile_moteur: "ok",
      fuite_moteur: "non",
    },
    Freinage: {
      frein_av: "ok",
      frein_ar: "ok",
      disque_frein_av: "ok",
      disque_frein_ar: "ok",
      frein_stationnement: "ok",
    },
    Direction: { direction: "ok", suspension: "ok", rotules: "ok" },
    Pneumatiques: { pneu_av: "ok", pneu_ar: "ok", profondeur_sculpture: "ok" },
    Eclairage: {
      phare_av_g: "ok",
      phare_av_d: "ok",
      feu_stop: "ok",
      feux_ar: "ok",
    },
    Carrosserie: { carrosserie: "ok", chassis: "ok", pare_brise: "ok" },
    Niveaux: { huile_moteur: "ok", liquide_refroid: "ok", liquide_frein: "ok" },
  },
  passation: {
    "Etat exterieur": {
      carrosserie: "ok",
      vitrages: "ok",
      retroviseurs: "ok",
      pneumatiques: "ok",
    },
    "Etat interieur": {
      siege: "ok",
      tableau_bord: "ok",
      ceintures: "ok",
      proprete_int: "ok",
    },
    Mecanique: { moteur: "ok", freins: "ok", direction: "ok", niveaux: "ok" },
    Documents: { carte_grise: "oui", assurance: "oui", cles: "oui" },
    Equipements: {
      extincteur: "oui",
      triangle: "oui",
      cric: "oui",
      roue_secours: "oui",
    },
  },
  attribution: {
    "Etat general": {
      carrosserie: "ok",
      pneumatiques: "ok",
      eclairage: "ok",
      freinage: "ok",
      moteur: "ok",
    },
    "Documents remis": {
      carte_grise: "oui",
      assurance: "oui",
      carnet_entretien: "oui",
    },
    "Equipements remis": {
      cles: "oui",
      extincteur: "oui",
      triangle: "oui",
      cric: "oui",
      roue_secours: "oui",
      carte_carburant: "non",
    },
    Proprete: { exterieur: "ok", interieur: "ok" },
  },
};

const VALEUR_LABELS: Record<string, { label: string; color: string }> = {
  ok: { label: "OK", color: "bg-green-100 text-green-700 border-green-300" },
  moyen: {
    label: "Moyen",
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
  mauvais: {
    label: "Mauvais",
    color: "bg-red-100 text-red-700 border-red-300",
  },
  oui: { label: "Oui", color: "bg-green-100 text-green-700 border-green-300" },
  non: { label: "Non", color: "bg-red-100 text-red-700 border-red-300" },
  na: { label: "N/A", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

function ChecklistItem({
  label,
  value,
  onChange,
  isBoolType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isBoolType: boolean;
}) {
  const options = isBoolType
    ? ["oui", "non", "na"]
    : ["ok", "moyen", "mauvais", "na"];
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-700 capitalize flex-1 pr-3">
        {label.replace(/_/g, " ")}
      </span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-2 py-0.5 text-xs rounded border font-medium transition-all ${value === opt ? VALEUR_LABELS[opt].color : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}
          >
            {VALEUR_LABELS[opt].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChecklistModal({
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
  const [type, setType] = useState("hebdomadaire_vehicule");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState(String(kmActuel));
  const [obs, setObs] = useState("");
  const [dataJson, setDataJson] = useState<
    Record<string, Record<string, string>>
  >(() =>
    JSON.parse(JSON.stringify(CHECKLIST_SECTIONS["hebdomadaire_vehicule"])),
  );

  const TYPES_CL = [
    { value: "hebdomadaire_vehicule", label: "Hebdo vehicule", icon: "🚗" },
    { value: "hebdomadaire_scooter", label: "Hebdo scooter", icon: "🛵" },
    { value: "visite_technique", label: "Visite tech.", icon: "🔍" },
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

  const VALEURS_NC = ["mauvais", "non"];
  const nbNc = Object.values(dataJson)
    .flatMap((s) => Object.values(s))
    .filter((v) => VALEURS_NC.includes(v)).length;

  const mutation = useMutation({
    mutationFn: (data: object) => checklistsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v-checks", vehiculeId] });
      toast.success("Checklist creee.");
      onClose();
    },
    onError: (err: any) => {
      const msgs = err?.response?.data?.errors;
      if (msgs) {
        const first = Object.values(msgs as Record<string, string[]>)[0]?.[0];
        toast.error(first ?? "Donnees invalides.");
      } else {
        toast.error(err?.response?.data?.message ?? "Erreur.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      vehicule_id: vehiculeId,
      agence_id: agenceId,
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
              {nbNc > 0 ? `⚠ ${nbNc} non-conformite(s)` : "✓ Tous conformes"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-primary-200 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        <form
          id="cl-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-5"
        >
          <div>
            <label className="label">Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES_CL.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all text-left ${type === t.value ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-200 hover:border-gray-300 text-gray-700"}`}
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
              <label className="label">Kilometrage</label>
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
            <label className="label">Elements de controle *</label>
            <div className="space-y-3">
              {Object.entries(dataJson).map(([section, items]) => {
                const firstVal = Object.values(items)[0] ?? "ok";
                const isBool = firstVal === "oui" || firstVal === "non";
                return (
                  <div
                    key={section}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        {section}
                      </span>
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
              rows={3}
              className="input resize-none"
              placeholder="Observations generales…"
            />
          </div>
        </form>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 rounded-b-2xl">
          <span
            className={`text-xs ${nbNc === 0 ? "text-green-600" : "text-red-600"}`}
          >
            {nbNc === 0 ? "✓ Conforme" : `⚠ ${nbNc} non-conformite(s)`}
          </span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              form="cl-form"
              disabled={mutation.isPending}
              className="btn-primary gap-2"
            >
              {mutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" /> Enregistrement…
                </>
              ) : (
                <>
                  <Plus size={15} /> Creer
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
// Modal — Détail checklist
// ─────────────────────────────────────────────────────────────

function ChecklistDetailModal({
  checklist: c,
  onClose,
}: {
  checklist: any;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-white font-semibold capitalize">
              {c.type_checklist?.replace(/_/g, " ")}
            </h3>
            <p className="text-primary-200 text-xs mt-0.5">
              {formatDate(c.date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-primary-200 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <span
              className={`badge ${c.statut === "valide" ? "badge-success" : c.statut === "rejete" ? "badge-danger" : c.statut === "soumis" ? "badge-info" : "badge-gray"}`}
            >
              {c.statut}
            </span>
            <span
              className={`badge ${c.resultat_global === "conforme" ? "badge-success" : c.resultat_global === "non_conforme" ? "badge-danger" : "badge-gray"}`}
            >
              {c.resultat_global?.replace(/_/g, " ")}
            </span>
          </div>
          <dl className="space-y-2">
            {[
              ["Kilométrage", formatKm(c.kilometrage)],
              ["Non-conformités", c.nb_non_conformites ?? 0],
              ["Chauffeur", c.chauffeur?.nom ?? "—"],
              ["Validé par", c.valide_par ?? "—"],
              ["Date validation", formatDate(c.valide_le)],
            ].map(([l, v]) => (
              <div
                key={l as string}
                className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"
              >
                <dt className="text-sm text-gray-500">{l}</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {v as string}
                </dd>
              </div>
            ))}
          </dl>
          {c.observations && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              {c.observations}
            </div>
          )}
          {c.nb_non_conformites > 0 && c.non_conformites?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
                Non-conformités
              </p>
              {c.non_conformites.map((nc: any, i: number) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <span
                    className={`badge flex-shrink-0 ${nc.critique ? "badge-danger" : "badge-warning"}`}
                  >
                    {nc.critique ? "Critique" : "Mineure"}
                  </span>
                  <span className="text-sm text-gray-700">
                    {nc.section} · {nc.item}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal — Nouveau signalement
// ─────────────────────────────────────────────────────────────

const TYPES_DEFAUT = [
  { value: "panne_moteur", label: "Panne moteur", icon: "🔴" },
  { value: "probleme_freins", label: "Freins", icon: "🛑" },
  { value: "probleme_pneu", label: "Pneu", icon: "⬤" },
  { value: "probleme_electrique", label: "Électrique", icon: "⚡" },
  { value: "probleme_carrosserie", label: "Carrosserie", icon: "🚗" },
  { value: "probleme_eclairage", label: "Éclairage", icon: "💡" },
  { value: "fuite", label: "Fuite", icon: "💧" },
  { value: "surchauffe", label: "Surchauffe", icon: "🌡️" },
  { value: "bruit_anormal", label: "Bruit anormal", icon: "🔊" },
  { value: "autre", label: "Autre", icon: "❓" },
];

function SignalementModal({
  vehiculeId,
  agenceId,
  onClose,
}: {
  vehiculeId: number;
  agenceId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [typeDefaut, setTypeDefaut] = useState("panne_moteur");
  const [gravite, setGravite] = useState<
    "faible" | "moyenne" | "haute" | "critique"
  >("moyenne");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (data: object) => signalementsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v-signaux", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["vehicule", vehiculeId] });
      toast.success("Signalement créé.");
      onClose();
    },
    onError: (err: any) => {
      const e = err?.response?.data?.errors as
        | Record<string, string[]>
        | undefined;
      if (e) {
        const m: Record<string, string> = {};
        Object.entries(e).forEach(([k, v]) => {
          m[k] = v[0];
        });
        setErrors(m);
      } else setErrors({ _global: err?.response?.data?.message ?? "Erreur." });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!titre.trim()) err.titre = "Titre obligatoire";
    if (!description.trim())
      err.description = "Description obligatoire (min 10 car.)";
    if (Object.keys(err).length) {
      setErrors(err);
      return;
    }
    mutation.mutate({
      vehicule_id: vehiculeId,
      agence_id: agenceId,
      origine: "chauffeur",
      date_signalement: date,
      type_defaut: typeDefaut,
      gravite,
      titre: titre.trim(),
      description: description.trim(),
      kilometrage: km ? parseInt(km) : undefined,
    });
  };

  const graviteColors = {
    faible: "border-blue-400 bg-blue-50 text-blue-700",
    moyenne: "border-yellow-400 bg-yellow-50 text-yellow-700",
    haute: "border-orange-400 bg-orange-50 text-orange-700",
    critique: "border-red-500 bg-red-50 text-red-700",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[90vh]">
        <div className="bg-danger px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Nouveau signalement
            </h3>
            <p className="text-red-100 text-xs mt-0.5">
              Déclarer une panne, défaut ou anomalie
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-red-100 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        <form
          id="signal-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-4"
        >
          {errors._global && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors._global}
            </div>
          )}
          <div>
            <label className="label">Type de défaut *</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES_DEFAUT.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTypeDefaut(t.value)}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border-2 text-xs font-medium transition-all ${typeDefaut === t.value ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}
                >
                  <span>{t.icon}</span>
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Gravité *</label>
            <div className="grid grid-cols-4 gap-2">
              {(["faible", "moyenne", "haute", "critique"] as const).map(
                (g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGravite(g)}
                    className={`p-2 rounded-xl border-2 text-xs font-semibold capitalize transition-all ${gravite === g ? graviteColors[g] : "border-gray-200 text-gray-500"}`}
                  >
                    {g}
                  </button>
                ),
              )}
            </div>
          </div>
          <div>
            <label className="label">Titre *</label>
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className={`input ${errors.titre ? "input-error" : ""}`}
              placeholder="Ex : Voyant moteur allumé, perte de puissance"
            />
            {errors.titre && <p className="error-msg">{errors.titre}</p>}
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`input resize-none ${errors.description ? "input-error" : ""}`}
              placeholder="Décrivez précisément le défaut constaté…"
            />
            {errors.description && (
              <p className="error-msg">{errors.description}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date de signalement</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
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
        </form>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-400">* Champs obligatoires</span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              form="signal-form"
              disabled={mutation.isPending}
              className="btn-danger gap-2"
            >
              {mutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" /> Envoi…
                </>
              ) : (
                <>
                  <AlertTriangle size={15} /> Signaler
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
// Modal — Détail signalement
// ─────────────────────────────────────────────────────────────

function SignalementDetailModal({
  signalement: s,
  onClose,
}: {
  signalement: any;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-danger px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-white font-semibold">{s.titre}</h3>
            <p className="text-red-100 text-xs mt-0.5">
              {formatDate(s.date_signalement)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-red-100 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <span
              className={`badge ${s.gravite === "critique" || s.gravite === "haute" ? "badge-danger" : s.gravite === "moyenne" ? "badge-warning" : "badge-info"}`}
            >
              {s.gravite}
            </span>
            <span
              className={`badge ${s.statut === "resolu" ? "badge-success" : s.statut === "nouveau" ? "badge-danger" : s.statut === "en_cours" ? "badge-warning" : "badge-gray"}`}
            >
              {s.statut?.replace(/_/g, " ")}
            </span>
          </div>
          <dl className="space-y-2">
            {[
              ["Type défaut", s.type_defaut?.replace(/_/g, " ")],
              ["Kilométrage", formatKm(s.kilometrage)],
              ["Chauffeur", s.chauffeur?.nom ?? "—"],
              ["Pris en charge", s.pris_en_charge_par ?? "—"],
              ["Résolu par", s.resolu_par ?? "—"],
              ["Date résolution", formatDate(s.resolu_le)],
            ].map(([l, v]) => (
              <div
                key={l as string}
                className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"
              >
                <dt className="text-sm text-gray-500">{l}</dt>
                <dd className="text-sm font-medium text-gray-900 text-right">
                  {(v as string) ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
          {s.description && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-line">
              {s.description}
            </div>
          )}
          {s.commentaire_resolution && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">
              <p className="text-xs font-medium text-green-600 mb-1">
                Commentaire de résolution
              </p>
              {s.commentaire_resolution}
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal — Nouvelle affectation
// ─────────────────────────────────────────────────────────────

function AffectationModal({
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
  const [chauffeurId, setChauffeurId] = useState("");
  const [type, setType] = useState<"livraison" | "administratif" | "mission">(
    "livraison",
  );
  const [dateDebut, setDateDebut] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [km, setKm] = useState(String(kmActuel));
  const [axeId, setAxeId] = useState("");

  const { data: chauffeurs = [] } = useQuery({
    queryKey: ["chauffeurs-select-actifs", agenceId],
    queryFn: () =>
      chauffeursApi
        .list({
          "filter[statut]": "actif",
          "filter[agence_id]": agenceId,
          per_page: 100,
        })
        .then((r) => r.data.data as any[]),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (data: object) => affectationsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v-affectas", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["vehicule", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Affectation créée.");
      onClose();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!km || parseInt(km) < 0) {
      toast.error("Kilométrage obligatoire.");
      return;
    }
    mutation.mutate({
      vehicule_id: vehiculeId,
      agence_id: agenceId,
      chauffeur_id: chauffeurId || null,
      type_affectation: type,
      date_debut: dateDebut,
      kilometrage_debut: parseInt(km),
      axe_livraison_id: axeId || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Nouvelle affectation
            </h3>
            <p className="text-primary-200 text-xs mt-0.5">
              Affecter ce véhicule à un chauffeur
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-primary-200 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Type d'affectation *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "livraison", label: "Livraison", icon: "🚚" },
                { value: "administratif", label: "Administratif", icon: "📋" },
                { value: "mission", label: "Mission", icon: "🗺" },
              ].map(({ value: v, label: l, icon: i }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setType(v as typeof type)}
                  className={`flex flex-col items-center p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${type === v ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}
                >
                  <span className="text-lg">{i}</span>
                  <span>{l}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Chauffeur</label>
            <select
              value={chauffeurId}
              onChange={(e) => setChauffeurId(e.target.value)}
              className="input"
            >
              <option value="">-- Sans chauffeur --</option>
              {chauffeurs.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.nom_complet}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date de début *</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Kilométrage départ *</label>
              <input
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                className="input"
                min={0}
                required
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary gap-2"
            >
              {mutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <ArrowLeftRight size={15} /> Créer
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
// Modal — Clôturer une affectation
// ─────────────────────────────────────────────────────────────

function CloturerAffectationModal({
  affectation,
  vehiculeId,
  onClose,
}: {
  affectation: any;
  vehiculeId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [kmFin, setKmFin] = useState("");
  const [dateFin, setDateFin] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (data: object) =>
      affectationsApi.cloturer(affectation.id, data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v-affectas", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["vehicule", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Affectation clôturée.");
      onClose();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kmFin) {
      toast.error("Kilométrage de fin obligatoire.");
      return;
    }
    mutation.mutate({
      kilometrage_fin: parseInt(kmFin),
      date_fin: dateFin,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm">
        <div className="bg-warning rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Clôturer l'affectation</h3>
            <p className="text-yellow-100 text-xs mt-0.5">
              {affectation.chauffeur?.nom ?? affectation.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-yellow-100 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Km de fin *</label>
              <input
                type="number"
                value={kmFin}
                onChange={(e) => setKmFin(e.target.value)}
                className="input"
                min={0}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Date de fin</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input resize-none"
            />
          </div>
          <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn bg-warning text-white hover:bg-warning-dark gap-2"
            >
              {mutation.isPending ? (
                <LoadingSpinner size="sm" />
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
// Modal — Détail d'un plein carburant
// ─────────────────────────────────────────────────────────────

interface CarburantDetailModalProps {
  carburant: any;
  onClose: () => void;
}

function CarburantDetailModal({
  carburant: c,
  onClose,
}: CarburantDetailModalProps) {
  const kmParcourus =
    c.kilometrage && c.km_precedent ? c.kilometrage - c.km_precedent : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-purple-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Détail carburant
            </h3>
            <p className="text-purple-200 text-xs mt-0.5">
              {formatDate(c.date)} · {c.station ?? "Station inconnue"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-4">
          {/* Métriques principales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="text-center p-3 bg-purple-50 rounded-xl border border-purple-100">
              <div className="text-2xl font-bold text-purple-700">
                {Number(c.litres).toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Litres</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-lg font-bold text-gray-900">
                {formatCfa(Number(c.montant))}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Montant</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
              {c.conso_100km ? (
                <>
                  <div
                    className={`text-2xl font-bold ${
                      Number(c.conso_100km) > 15
                        ? "text-red-600"
                        : Number(c.conso_100km) > 10
                          ? "text-yellow-600"
                          : "text-green-600"
                    }`}
                  >
                    {Number(c.conso_100km).toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">L/100km</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-300">—</div>
                  <div className="text-xs text-gray-400 mt-0.5">L/100km</div>
                </>
              )}
            </div>
          </div>

          {/* Détails */}
          <dl className="space-y-2.5">
            {[
              ["Date", formatDate(c.date)],
              ["Type carburant", c.type_carburant ?? "—"],
              ["Station", c.station ?? "—"],
              [
                "Prix unitaire",
                c.prix_unitaire
                  ? `${Number(c.prix_unitaire).toLocaleString("fr-SN")} FCFA/L`
                  : "—",
              ],
              ["N° transaction", c.numero_transaction ?? "—"],
              ["Kilométrage", c.kilometrage ? formatKm(c.kilometrage) : "—"],
              ["Km précédent", c.km_precedent ? formatKm(c.km_precedent) : "—"],
              ["Km parcourus", kmParcourus ? formatKm(kmParcourus) : "—"],
              [
                "Type de plein",
                c.est_complet ? "✓ Plein complet" : "○ Plein partiel",
              ],
              ["Chauffeur", c.chauffeur?.nom ?? "—"],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="flex justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0"
              >
                <dt className="text-sm text-gray-500 flex-shrink-0">{label}</dt>
                <dd className="text-sm font-medium text-gray-900 text-right">
                  {value as string}
                </dd>
              </div>
            ))}
          </dl>

          {/* Notes */}
          {c.notes && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                Notes
              </p>
              <p className="text-sm text-gray-700">{c.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal — Saisie carburant
// ─────────────────────────────────────────────────────────────

interface CarburantModalProps {
  vehiculeId: number;
  agenceId: number;
  kmActuel: number;
  typeCarburant: string | null;
  onClose: () => void;
}

function CarburantModal({
  vehiculeId,
  agenceId,
  kmActuel,
  typeCarburant,
  onClose,
}: CarburantModalProps) {
  const qc = useQueryClient();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [litres, setLitres] = useState("");
  const [prixLitre, setPrixLitre] = useState(
    String(getPrixDefaut("Diesel") ?? 990),
  );
  const [montant, setMontant] = useState("");
  const [station, setStation] = useState("");
  const [km, setKm] = useState(String(kmActuel));
  const [typeCarbu, setTypeCarbu] = useState(typeCarburant ?? "Diesel");
  const [noTransaction, setNoTransaction] = useState("");
  const [estComplet, setEstComplet] = useState(true);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Flag anti-boucle
  const calculatingRef = useRef(false);

  // ── 1. Changement type → prix défaut ─────────────────────────
  // ── 1. Type → prix défaut → recalcule montant ───────────────
  const handleTypeChange = (val: string) => {
    setTypeCarbu(val);
    const p = getPrixDefaut(val);
    if (p === null) return;
    setPrixLitre(String(p));
    const l = parseFloat(litres);
    if (l > 0) {
      calculatingRef.current = true;
      setMontant(String(calculerMontant(l, p)));
      setTimeout(() => {
        calculatingRef.current = false;
      }, 0);
    }
  };

  // ── 2. Prix/L change → recalcule montant (litres conservés) ──
  const handlePrixChange = (val: string) => {
    setPrixLitre(val);
    if (calculatingRef.current) return;
    const l = parseFloat(litres);
    const p = parseFloat(val);
    if (l > 0 && p > 0) {
      calculatingRef.current = true;
      setMontant(String(calculerMontant(l, p)));
      setTimeout(() => {
        calculatingRef.current = false;
      }, 0);
    }
  };

  // ── 3. Litres saisis → recalcule montant ─────────────────────
  const handleLitresChange = (val: string) => {
    setLitres(val);
    if (calculatingRef.current) return;
    const l = parseFloat(val);
    const p = parseFloat(prixLitre);
    if (l > 0 && p > 0) {
      calculatingRef.current = true;
      setMontant(String(calculerMontant(l, p)));
      setTimeout(() => {
        calculatingRef.current = false;
      }, 0);
    }
  };

  // ── 4. Montant saisi → recalcule litres ──────────────────────
  const handleMontantChange = (val: string) => {
    setMontant(val);
    if (calculatingRef.current) return;
    const m = parseFloat(val);
    const p = parseFloat(prixLitre);
    if (m > 0 && p > 0) {
      calculatingRef.current = true;
      const l = Math.round((m / p) * 10) / 10; // arrondi 1 décimale
      setLitres(String(l));
      setTimeout(() => {
        calculatingRef.current = false;
      }, 0);
    }
  };

  // Conso calculée (si km précédent dispo)
  const consoPrev =
    km && parseFloat(litres) > 0 && parseInt(km) > kmActuel
      ? ((parseFloat(litres) / (parseInt(km) - kmActuel)) * 100).toFixed(1)
      : null;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!date) e.date = "Date obligatoire";
    if (!litres || parseFloat(litres) <= 0)
      e.litres = "Litres obligatoire (> 0)";
    if (!montant || parseFloat(montant) < 0) e.montant = "Montant obligatoire";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: (data: object) => carburantApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v-carbu", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["vehicule", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Consommation carburant enregistrée.");
      onClose();
    },
    onError: (err: any) => {
      const laravelErrors = err?.response?.data?.errors as
        | Record<string, string[]>
        | undefined;
      if (laravelErrors) {
        const mapped: Record<string, string> = {};
        Object.entries(laravelErrors).forEach(([k, v]) => {
          mapped[k] = v[0];
        });
        setErrors(mapped);
      } else {
        setErrors({
          _global:
            err?.response?.data?.message ?? "Erreur lors de l'enregistrement.",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      vehicule_id: vehiculeId,
      agence_id: agenceId,
      date,
      litres: parseFloat(litres),
      montant: parseFloat(montant),
      prix_unitaire: prixLitre ? parseFloat(prixLitre) : undefined,
      type_carburant: typeCarbu || undefined,
      kilometrage: km ? parseInt(km) : undefined,
      station: station.trim() || undefined,
      numero_transaction: noTransaction.trim() || undefined,
      est_complet: estComplet,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-purple-700 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Saisie carburant
            </h3>
            <p className="text-purple-200 text-xs mt-0.5">
              Enregistrer un plein pour ce véhicule
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white transition-colors text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <form
          id="carbu-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-4"
        >
          {errors._global && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors._global}
            </div>
          )}

          {/* Date + Type carburant */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className={`input ${errors.date ? "input-error" : ""}`}
              />
              {errors.date && <p className="error-msg">{errors.date}</p>}
            </div>
            <div>
              <label className="label">Type de carburant</label>
              <select
                value={typeCarbu}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="input"
              >
                {Object.entries(PRIX_CARBURANT_DEFAUT).map(
                  ([val, { label, prix }]) => (
                    <option key={val} value={val}>
                      {label} — {prix.toLocaleString("fr-FR")} FCFA
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          {/* Litres + Prix/L */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Litres *</label>
              <input
                type="number"
                value={litres}
                onChange={(e) => handleLitresChange(e.target.value)}
                className={`input ${errors.litres ? "input-error" : ""}`}
                min={0.1}
                step={0.1}
                placeholder="Ex : 45.5"
              />
              {errors.litres && <p className="error-msg">{errors.litres}</p>}
            </div>
            <div>
              <label className="label flex items-center gap-1">
                Prix / litre (FCFA)
                <span className="text-xs text-purple-500 font-normal">
                  pré-rempli
                </span>
              </label>
              <input
                type="number"
                value={prixLitre}
                onChange={(e) => handlePrixChange(e.target.value)}
                className="input"
                min={0}
                step={1}
                placeholder="990"
              />
            </div>
          </div>

          {/* Montant — calculé mais modifiable */}
          <div>
            <label className="label flex items-center gap-1">
              Montant total (FCFA) *
              <span className="text-xs text-purple-500 font-normal">
                calculé auto
              </span>
            </label>
            <input
              type="number"
              value={montant}
              onChange={(e) => handleMontantChange(e.target.value)}
              className={`input ${errors.montant ? "input-error" : ""}`}
              min={0}
              step={100}
              placeholder="Ex : 45 000"
            />
            {errors.montant && <p className="error-msg">{errors.montant}</p>}
            {/* Aperçu calcul */}
            {litres &&
              prixLitre &&
              parseFloat(litres) > 0 &&
              parseFloat(prixLitre) > 0 && (
                <p className="text-xs text-purple-600 mt-1 font-medium">
                  {parseFloat(litres).toLocaleString("fr-FR", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  L × {parseFloat(prixLitre).toLocaleString("fr-FR")} FCFA/L ={" "}
                  <strong>
                    {calculerMontant(
                      parseFloat(litres),
                      parseFloat(prixLitre),
                    ).toLocaleString("fr-FR")}{" "}
                    FCFA
                  </strong>
                </p>
              )}
          </div>

          {/* Station + N° transaction */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Station / Lieu</label>
              <input
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="input"
                placeholder="Total Liberté, Shell…"
              />
            </div>
            <div>
              <label className="label">N° transaction</label>
              <input
                value={noTransaction}
                onChange={(e) => setNoTransaction(e.target.value)}
                className="input"
                placeholder="REF-2025-001"
              />
            </div>
          </div>

          {/* Kilométrage */}
          <div>
            <label className="label">Kilométrage au compteur</label>
            <input
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className="input"
              placeholder={`> ${kmActuel.toLocaleString("fr-FR")} km`}
              min={kmActuel}
            />
            {consoPrev && (
              <p className="text-xs text-purple-600 mt-1">
                Consommation estimée : <strong>{consoPrev} L/100km</strong>
              </p>
            )}
          </div>

          {/* Plein complet */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="est-complet-carbu"
              checked={estComplet}
              onChange={(e) => setEstComplet(e.target.checked)}
              className="w-4 h-4 accent-purple-600"
            />
            <label
              htmlFor="est-complet-carbu"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Plein complet (à ras bord)
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Remarques optionnelles…"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            type="submit"
            form="carbu-form"
            disabled={mutation.isPending}
            className="btn bg-purple-700 text-white hover:bg-purple-800 gap-2"
          >
            {mutation.isPending ? (
              <>
                <LoadingSpinner size="sm" /> Enregistrement…
              </>
            ) : (
              <>
                <Fuel size={14} /> Enregistrer le plein
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal — Saisie opération pneumatique
// ─────────────────────────────────────────────────────────────

const POSITIONS_PNEU = [
  { value: "", label: "— Non spécifiée —" },
  { value: "avant_gauche", label: "Avant gauche" },
  { value: "avant_droit", label: "Avant droit" },
  { value: "arriere_gauche", label: "Arrière gauche" },
  { value: "arriere_droit", label: "Arrière droit" },
  { value: "secours", label: "Roue de secours" },
  { value: "train_complet", label: "Train complet (4 roues)" },
];

const TYPES_OP_PNEU = [
  { value: "achat_neuf", label: "Achat neuf" },
  { value: "rechape", label: "Rechapé" },
  { value: "rotation", label: "Rotation" },
  { value: "reparation", label: "Réparation" },
  { value: "reforme", label: "Réforme" },
];

interface PneumatiqueModalProps {
  vehiculeId: number;
  agenceId: number;
  kmActuel: number;
  onClose: () => void;
}

function PneumatiqueModal({
  vehiculeId,
  agenceId,
  kmActuel,
  onClose,
}: PneumatiqueModalProps) {
  const qc = useQueryClient();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [typeOp, setTypeOp] = useState("achat_neuf");
  const [position, setPosition] = useState("");
  const [marquePneu, setMarquePneu] = useState("");
  const [dimension, setDimension] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [montantTotal, setMontantTotal] = useState("");
  const [km, setKm] = useState(String(kmActuel));
  const [commentaire, setCommentaire] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const calculatingRef = useRef(false);

  // Quantité ou prix change → recalcule montant
  const recalcMontant = (q: string, p: string) => {
    const qn = parseFloat(q);
    const pn = parseFloat(p);
    if (qn > 0 && pn > 0) {
      calculatingRef.current = true;
      setMontantTotal(String(Math.round(qn * pn)));
      setTimeout(() => {
        calculatingRef.current = false;
      }, 0);
    }
  };

  const handleQuantiteChange = (val: string) => {
    setQuantite(val);
    if (calculatingRef.current) return;
    recalcMontant(val, prixUnitaire);
  };

  const handlePrixChange = (val: string) => {
    setPrixUnitaire(val);
    if (calculatingRef.current) return;
    recalcMontant(quantite, val);
  };

  // Montant saisi → recalcule prix unitaire (quantité conservée)
  const handleMontantChange = (val: string) => {
    setMontantTotal(val);
    if (calculatingRef.current) return;
    const qn = parseFloat(quantite);
    const mn = parseFloat(val);
    if (qn > 0 && mn > 0) {
      calculatingRef.current = true;
      setPrixUnitaire(String(Math.round((mn / qn) * 100) / 100));
      setTimeout(() => {
        calculatingRef.current = false;
      }, 0);
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!date) e.date = "Date obligatoire";
    if (!quantite || parseFloat(quantite) < 1) e.quantite = "Quantité ≥ 1";
    if (!montantTotal || parseFloat(montantTotal) < 0)
      e.montant_total = "Montant obligatoire";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: (data: object) => pneumatiquesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v-pneus", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["pneumatiques"] });
      qc.invalidateQueries({ queryKey: ["vehicule", vehiculeId] });
      toast.success("Opération pneumatique enregistrée.");
      onClose();
    },
    onError: (err: any) => {
      const laravelErrors = err?.response?.data?.errors as
        | Record<string, string[]>
        | undefined;
      if (laravelErrors) {
        const mapped: Record<string, string> = {};
        Object.entries(laravelErrors).forEach(([k, v]) => {
          mapped[k] = v[0];
        });
        setErrors(mapped);
      } else {
        setErrors({
          _global:
            err?.response?.data?.message ?? "Erreur lors de l'enregistrement.",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      vehicule_id: vehiculeId,
      agence_id: agenceId,
      date,
      type_operation: typeOp,
      position: position || undefined,
      marque_pneu: marquePneu.trim() || undefined,
      dimension: dimension.trim() || undefined,
      quantite: parseInt(quantite),
      prix_unitaire: prixUnitaire ? parseFloat(prixUnitaire) : undefined,
      montant_total: parseFloat(montantTotal),
      kilometrage: km ? parseInt(km) : undefined,
      commentaire: commentaire.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[90vh]">
        <div className="bg-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Opération pneumatique
            </h3>
            <p className="text-gray-300 text-xs mt-0.5">
              Enregistrer une opération pour ce véhicule
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <form
          id="pneu-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-4"
        >
          {errors._global && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors._global}
            </div>
          )}

          {/* Date + Type opération */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className={`input ${errors.date ? "input-error" : ""}`}
              />
              {errors.date && <p className="error-msg">{errors.date}</p>}
            </div>
            <div>
              <label className="label">Type d'opération</label>
              <select
                value={typeOp}
                onChange={(e) => setTypeOp(e.target.value)}
                className="input"
              >
                {TYPES_OP_PNEU.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Position + Marque */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="input"
              >
                {POSITIONS_PNEU.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Marque du pneu</label>
              <input
                value={marquePneu}
                onChange={(e) => setMarquePneu(e.target.value)}
                className="input"
                placeholder="Michelin, Continental…"
              />
            </div>
          </div>

          {/* Dimension */}
          <div>
            <label className="label">Dimension</label>
            <input
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              className="input"
              placeholder="ex : 215/65 R16"
            />
          </div>

          {/* Quantité + Prix/u + Montant */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Quantité *</label>
              <input
                type="number"
                value={quantite}
                onChange={(e) => handleQuantiteChange(e.target.value)}
                className={`input ${errors.quantite ? "input-error" : ""}`}
                min={1}
                max={20}
                step={1}
              />
              {errors.quantite && (
                <p className="error-msg">{errors.quantite}</p>
              )}
            </div>
            <div>
              <label className="label">Prix/u (FCFA)</label>
              <input
                type="number"
                value={prixUnitaire}
                onChange={(e) => handlePrixChange(e.target.value)}
                className="input"
                min={0}
                step={1}
                placeholder="35 000"
              />
            </div>
            <div>
              <label className="label">Montant total *</label>
              <input
                type="number"
                value={montantTotal}
                onChange={(e) => handleMontantChange(e.target.value)}
                className={`input ${errors.montant_total ? "input-error" : ""}`}
                min={0}
                step={100}
                placeholder="140 000"
              />
              {errors.montant_total && (
                <p className="error-msg">{errors.montant_total}</p>
              )}
            </div>
          </div>
          {quantite &&
            prixUnitaire &&
            parseFloat(quantite) > 0 &&
            parseFloat(prixUnitaire) > 0 && (
              <p className="text-xs text-gray-500 -mt-1">
                {quantite} × {parseFloat(prixUnitaire).toLocaleString("fr-FR")}{" "}
                FCFA ={" "}
                <strong>
                  {Math.round(
                    parseFloat(quantite) * parseFloat(prixUnitaire),
                  ).toLocaleString("fr-FR")}{" "}
                  FCFA
                </strong>
              </p>
            )}

          {/* Kilométrage */}
          <div>
            <label className="label">Kilométrage</label>
            <input
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className="input"
              placeholder={`> ${kmActuel.toLocaleString("fr-FR")} km`}
              min={0}
            />
          </div>

          {/* Commentaire */}
          <div>
            <label className="label">Commentaire</label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Remarques optionnelles…"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            type="submit"
            form="pneu-form"
            disabled={mutation.isPending}
            className="btn bg-gray-700 text-white hover:bg-gray-800 gap-2"
          >
            {mutation.isPending ? (
              <>
                <LoadingSpinner size="sm" /> Enregistrement…
              </>
            ) : (
              <>
                <CircleDot size={14} /> Enregistrer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal — Mise à jour kilométrage
// ─────────────────────────────────────────────────────────────

function KmModal({
  vehiculeId,
  kmActuel,
  onClose,
}: {
  vehiculeId: number;
  kmActuel: number;
  onClose: () => void;
}) {
  const [km, setKm] = useState("");
  const updateKm = useUpdateKilometrage(vehiculeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(km);
    if (!val || val <= kmActuel) {
      toast.error(
        `Le kilométrage doit être supérieur à ${kmActuel.toLocaleString("fr-SN")} km.`,
      );
      return;
    }
    await updateKm.mutateAsync(val);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-1">
          Mettre à jour le kilométrage
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Actuel : <strong className="font-mono">{formatKm(kmActuel)}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nouveau kilométrage</label>
            <input
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              min={kmActuel + 1}
              className="input"
              placeholder={`> ${kmActuel.toLocaleString("fr-SN")} km`}
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={updateKm.isPending}
              className="btn-primary gap-2"
            >
              {updateKm.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                "Enregistrer"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────

export default function VehiculeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuthStore();
  const vehiculeId = parseInt(id!);

  const [tab, setTab] = useState("info");
  const [kmModal, setKmModal] = useState(false);
  const [docModal, setDocModal] = useState(false);
  const [maintModal, setMaintModal] = useState(false);
  const [carbuModal, setCarbuModal] = useState(false);
  const [pneuModal, setPneuModal] = useState(false);
  const [carbuDetail, setCarbuDetail] = useState<any>(null);
  const [checklistModal, setChecklistModal] = useState(false);
  const [checklistDetail, setChecklistDetail] = useState<any>(null);
  const [signalementModal, setSignalementModal] = useState(false);
  const [signalementDetail, setSignalementDetail] = useState<any>(null);
  const [creeMaintFromSig, setCreeMaintFromSig] = useState<any>(null); // signalement source
  const [affectationModal, setAffectationModal] = useState(false);
  const [cloturerAffectModal, setCloturerAffectModal] = useState<any>(null);
  const [tcoAnnee, setTcoAnnee] = useState(new Date().getFullYear());
  const [renouvModal, setRenouvModal] = useState<any>(null);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  const [viewerDoc, setViewerDoc] = useState<{
    url: string;
    nom: string | null;
    type: string;
  } | null>(null);

  // Véhicule principal
  const { data: vehicule, isLoading, error, refetch } = useVehicule(vehiculeId);

  // Sous-ressources — chargées uniquement quand l'onglet est actif
  const { data: docs, isLoading: lDocs } = useQuery({
    queryKey: ["v-docs", vehiculeId],
    queryFn: () =>
      vehiculesApi.documents(vehiculeId).then((r) => {
        // L'API retourne { data: [...] } ou directement [...] selon le controller
        const raw = r.data;
        return Array.isArray(raw) ? raw : (raw.data ?? []);
      }),
    enabled: tab === "documents",
  });
  const { data: maints, isLoading: lMaints } = useQuery({
    queryKey: ["v-maints", vehiculeId],
    queryFn: () => vehiculesApi.maintenances(vehiculeId).then((r) => r.data),
    enabled: tab === "maintenances",
  });
  const { data: carbu, isLoading: lCarbu } = useQuery({
    queryKey: ["v-carbu", vehiculeId],
    queryFn: () => vehiculesApi.carburant(vehiculeId).then((r) => r.data),
    enabled: tab === "carburant",
  });
  const { data: pneus, isLoading: lPneus } = useQuery({
    queryKey: ["v-pneus", vehiculeId],
    queryFn: () =>
      pneumatiquesApi
        .list({
          "filter[vehicule_id]": vehiculeId,
          sort: "-date",
          include: "fournisseur",
          per_page: 50,
        })
        .then((r) => r.data),
    enabled: tab === "pneumatiques",
  });
  const { data: checks, isLoading: lChecks } = useQuery({
    queryKey: ["v-checks", vehiculeId],
    queryFn: () => vehiculesApi.checklists(vehiculeId).then((r) => r.data),
    enabled: tab === "checklists",
  });
  const { data: signaux, isLoading: lSignaux } = useQuery({
    queryKey: ["v-signaux", vehiculeId],
    queryFn: () => vehiculesApi.signalements(vehiculeId).then((r) => r.data),
    enabled: tab === "signalements",
  });
  const { data: affectas, isLoading: lAffectas } = useQuery({
    queryKey: ["v-affectas", vehiculeId],
    queryFn: () => vehiculesApi.affectations(vehiculeId).then((r) => r.data),
    enabled: tab === "affectations",
  });
  const { data: tco, isLoading: lTco } = useQuery({
    queryKey: ["v-tco", vehiculeId, tcoAnnee],
    queryFn: () =>
      vehiculesApi.tco(vehiculeId, tcoAnnee).then((r) => r.data.data),
    enabled: tab === "tco",
  });

  // Suppression document
  const deleteDoc = useMutation({
    mutationFn: (docId: number) => documentsApi.delete(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v-docs", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["vehicule", vehiculeId] });
      toast.success("Document supprimé.");
      setDeleteDocId(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ?? "Erreur lors de la suppression.",
      );
    },
  });

  const handlePrintPdf = async () => {
    try {
      const res = await rapportsApi.pdfVehicule(vehiculeId);
      downloadBlob(
        res.data as Blob,
        `vehicule_${vehicule?.immatriculation}.pdf`,
      );
    } catch {
      toast.error("Erreur lors de la génération du PDF.");
    }
  };

  // ── Rendu ──────────────────────────────────────────────────
  if (isLoading)
    return (
      <div className="card p-6">
        <CardLoading rows={8} />
      </div>
    );
  if (error || !vehicule)
    return <ErrorState message="Véhicule non trouvé." onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Modaux */}
      {kmModal && (
        <KmModal
          vehiculeId={vehiculeId}
          kmActuel={vehicule.kilometrage_actuel}
          onClose={() => setKmModal(false)}
        />
      )}
      {docModal && (
        <DocumentModal
          vehiculeId={vehiculeId}
          agenceId={vehicule.agence_id}
          onClose={() => setDocModal(false)}
        />
      )}
      {maintModal && (
        <MaintenanceModal
          vehiculeId={vehiculeId}
          agenceId={vehicule.agence_id}
          kmActuel={vehicule.kilometrage_actuel}
          onClose={() => setMaintModal(false)}
        />
      )}
      {checklistModal && (
        <ChecklistModal
          vehiculeId={vehiculeId}
          agenceId={vehicule.agence_id}
          kmActuel={vehicule.kilometrage_actuel}
          onClose={() => setChecklistModal(false)}
        />
      )}
      {checklistDetail && (
        <ChecklistDetailModal
          checklist={checklistDetail}
          onClose={() => setChecklistDetail(null)}
        />
      )}
      {creeMaintFromSig && (
        <CreerMaintenanceModal
          signalement={creeMaintFromSig}
          onClose={() => setCreeMaintFromSig(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["v-signaux", vehiculeId] });
            qc.invalidateQueries({ queryKey: ["v-maints", vehiculeId] });
          }}
        />
      )}
      {signalementModal && (
        <SignalementModal
          vehiculeId={vehiculeId}
          agenceId={vehicule.agence_id}
          onClose={() => setSignalementModal(false)}
        />
      )}
      {signalementDetail && (
        <SignalementDetailModal
          signalement={signalementDetail}
          onClose={() => setSignalementDetail(null)}
        />
      )}
      {affectationModal && (
        <AffectationModal
          vehiculeId={vehiculeId}
          agenceId={vehicule.agence_id}
          kmActuel={vehicule.kilometrage_actuel}
          onClose={() => setAffectationModal(false)}
        />
      )}
      {cloturerAffectModal && (
        <CloturerAffectationModal
          affectation={cloturerAffectModal}
          vehiculeId={vehiculeId}
          onClose={() => setCloturerAffectModal(null)}
        />
      )}
      {carbuModal && (
        <CarburantModal
          vehiculeId={vehiculeId}
          agenceId={vehicule.agence_id}
          kmActuel={vehicule.kilometrage_actuel}
          typeCarburant={vehicule.type_carburant}
          onClose={() => setCarbuModal(false)}
        />
      )}
      {pneuModal && (
        <PneumatiqueModal
          vehiculeId={vehiculeId}
          agenceId={vehicule.agence_id}
          kmActuel={vehicule.kilometrage_actuel}
          onClose={() => setPneuModal(false)}
        />
      )}
      {carbuDetail && (
        <CarburantDetailModal
          carburant={carbuDetail}
          onClose={() => setCarbuDetail(null)}
        />
      )}
      {renouvModal && (
        <RenouvelerModal
          document={renouvModal}
          onClose={() => setRenouvModal(null)}
        />
      )}
      {viewerDoc && (
        <DocumentViewerModal
          url={viewerDoc.url}
          nom={viewerDoc.nom}
          type={viewerDoc.type}
          onClose={() => setViewerDoc(null)}
        />
      )}
      <ConfirmDialog
        open={deleteDocId !== null}
        onClose={() => setDeleteDocId(null)}
        onConfirm={() => deleteDocId && deleteDoc.mutate(deleteDocId)}
        loading={deleteDoc.isPending}
        title="Supprimer le document"
        message="Cette action est irréversible. Le fichier associé sera également supprimé."
        confirmLabel="Supprimer"
        variant="danger"
      />

      {/* En-tête */}
      <PageHeader
        title={
          <PlaqueSN
            immatriculation={vehicule.immatriculation}
            style={vehicule.style_plaque ?? "nouvelle"}
            ville={vehicule.plaque_ville ?? ""}
            codeVille={vehicule.plaque_code_ville ?? ""}
            size="md"
          />
        }
        subtitle={`${vehicule.marque} ${vehicule.modele} · ${vehicule.agence?.nom ?? ""}`}
        backTo="/vehicules"
        actions={
          <>
            <button
              onClick={() => setKmModal(true)}
              className="btn-secondary gap-2"
              title="Mettre à jour le kilométrage"
            >
              <Gauge size={16} /> Km
            </button>
            <button
              onClick={() => navigate(`/vehicules/${id}/fiche-vie`)}
              className="btn-secondary gap-2"
              title="Fiche de vie du véhicule"
            >
              <Heart size={16} /> Fiche de vie
            </button>
            <button onClick={handlePrintPdf} className="btn-secondary gap-2">
              <Printer size={16} /> PDF
            </button>
            {hasPermission("vehicule.update") && (
              <button
                onClick={() => navigate(`/vehicules/${id}/modifier`)}
                className="btn-primary gap-2"
              >
                <Edit size={16} /> Modifier
              </button>
            )}
          </>
        }
      />

      {/* Badges résumé */}
      <div className="flex flex-wrap items-center gap-2">
        <span title="Statut du véhicule">
          <StatutVehiculeBadge statut={vehicule.statut} />
        </span>
        <span title="Type de véhicule">
          <TypeVehiculeBadge type={vehicule.type_vehicule} />
        </span>
        <span title="Visite technique">
          <StatutDocumentBadge
            statut={vehicule.statut_vt}
            jours={vehicule.jours_avant_vt}
          />
        </span>
        <span title="Assurance">
          <StatutDocumentBadge
            statut={vehicule.statut_assurance}
            jours={vehicule.jours_avant_assurance}
          />
        </span>
        <span className="badge badge-gray font-mono" title="Kilométrage actuel">
          {formatKm(vehicule.kilometrage_actuel)}
        </span>
        {vehicule.affectation_active?.chauffeur && (
          <span
            className="badge badge-info"
            title="Chauffeur actuellement affecté"
          >
            ⇒ {vehicule.affectation_active.chauffeur.nom}
          </span>
        )}
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0.5 overflow-x-auto scrollbar-thin">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
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

      {/* ── Contenu des onglets ── */}
      <div className="card p-6">
        {/* INFORMATIONS */}
        {tab === "info" && (
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
            {[
              ["Immatriculation", vehicule.immatriculation],
              ["Marque", vehicule.marque],
              ["Modèle", vehicule.modele],
              ["Type", vehicule.type_vehicule],
              ["Catégorie", vehicule.categorie],
              ["Énergie", vehicule.energie],
              ["Année de fabrication", vehicule.annee_fabrication],
              ["N° de châssis", vehicule.numero_chassis],
              ["Agence", vehicule.agence?.nom],
              ["Kilométrage actuel", formatKm(vehicule.kilometrage_actuel)],
              [
                "Prochain entretien (km)",
                formatKm(vehicule.prochain_entretien_km),
              ],
              [
                "Prochain entretien (date)",
                formatDate(vehicule.prochain_entretien_date),
              ],
              ["Dernière VT", formatDate(vehicule.date_derniere_visite_tech)],
              ["Prochaine VT", formatDate(vehicule.date_prochaine_visite_tech)],
              [
                "Expiration assurance",
                formatDate(vehicule.date_expiration_assurance),
              ],
              ["N° assurance", vehicule.numero_assurance],
              ["Compagnie assurance", vehicule.compagnie_assurance],
              ["Carte carburant", vehicule.numero_carte_carburant],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  {label}
                </dt>
                <dd className="text-sm font-medium text-gray-900">
                  {value ?? "—"}
                </dd>
              </div>
            ))}
            {vehicule.notes && (
              <div className="col-span-full">
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Notes
                </dt>
                <dd className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {vehicule.notes}
                </dd>
              </div>
            )}
          </dl>
        )}

        {/* PHOTOS */}
        {tab === "photos" && <VehiculePhotos vehiculeId={vehicule.id} />}

        {/* DOCUMENTS */}
        {tab === "documents" && (
          <div>
            {/* Bouton ajout */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {Array.isArray(docs) ? docs.length : 0} document(s) actif(s)
              </h3>
              <button
                onClick={() => setDocModal(true)}
                className="btn-primary btn-sm gap-1.5"
              >
                <Plus size={14} /> Ajouter un document
              </button>
            </div>

            {lDocs ? (
              <CardLoading rows={3} />
            ) : !docs || docs.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium mb-1">
                  Aucun document enregistré
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Ajoutez la carte grise, l'assurance, la visite technique…
                </p>
                <button
                  onClick={() => setDocModal(true)}
                  className="btn-primary gap-2"
                >
                  <Plus size={15} /> Ajouter le premier document
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {(docs as any[]).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors"
                  >
                    {/* Icône type */}
                    <span className="text-2xl flex-shrink-0">
                      {TYPES_DOCUMENT.find((t) => t.value === doc.type_document)
                        ?.icon ?? "📄"}
                    </span>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">
                          {getTypeDocumentLabel(doc.type_document)}
                        </span>
                        <StatutDocumentBadge
                          statut={doc.statut_calcule ?? doc.statut}
                          jours={doc.jours_avant_expiration}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                        {doc.numero && <span>N° {doc.numero}</span>}
                        {doc.organisme_emetteur && (
                          <span>{doc.organisme_emetteur}</span>
                        )}
                        {doc.date_emission && (
                          <span>Émis le {formatDate(doc.date_emission)}</span>
                        )}
                        {doc.date_expiration && (
                          <span
                            className={
                              (doc.jours_avant_expiration ?? 999) < 0
                                ? "text-red-600 font-medium"
                                : (doc.jours_avant_expiration ?? 999) < 30
                                  ? "text-yellow-600 font-medium"
                                  : ""
                            }
                          >
                            Expire le {formatDate(doc.date_expiration)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {doc.fichier_url ? (
                        // Bouton visualiser — ouverture du viewer inline
                        <button
                          onClick={() =>
                            setViewerDoc({
                              url: mediaUrl(doc.fichier_url)!,
                              nom: doc.fichier_nom,
                              type: doc.type_document,
                            })
                          }
                          className="btn-icon text-primary-600 hover:bg-primary-50"
                          title="Visualiser le document"
                        >
                          <Eye size={15} />
                        </button>
                      ) : (
                        // Pas de fichier uploadé — placeholder grisé
                        <span
                          className="p-2 text-gray-300 cursor-not-allowed"
                          title="Aucun fichier disponible"
                        >
                          <Eye size={15} />
                        </span>
                      )}
                      <button
                        onClick={() =>
                          setRenouvModal({
                            id: doc.id,
                            vehicule_id: vehiculeId,
                            type_document: doc.type_document,
                            numero: doc.numero,
                            organisme_emetteur: doc.organisme_emetteur,
                          })
                        }
                        className="btn-icon text-yellow-600 hover:bg-yellow-50"
                        title="Renouveler"
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteDocId(doc.id)}
                        className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MAINTENANCES */}
        {tab === "maintenances" && (
          <div>
            {/* En-tête avec bouton ajout */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {maints?.data ? `${maints.data.length} intervention(s)` : ""}
              </h3>
              <button
                onClick={() => setMaintModal(true)}
                className="btn-primary btn-sm gap-1.5"
              >
                <Plus size={14} /> Nouvelle maintenance
              </button>
            </div>

            {lMaints ? (
              <CardLoading rows={4} />
            ) : !maints?.data || maints.data.length === 0 ? (
              <div className="text-center py-12">
                <Wrench size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium mb-1">
                  Aucune maintenance enregistrée
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Les interventions sur ce véhicule apparaîtront ici.
                </p>
                <button
                  onClick={() => setMaintModal(true)}
                  className="btn-primary gap-2"
                >
                  <Plus size={15} /> Enregistrer une maintenance
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {maints.data.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/maintenances/${m.id}`)}
                  >
                    {/* Indicateur couleur type */}
                    <div
                      className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                        m.statut === "termine"
                          ? "bg-success"
                          : m.statut === "en_cours"
                            ? "bg-warning"
                            : m.statut === "planifie"
                              ? "bg-info"
                              : "bg-gray-300"
                      }`}
                    />

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">
                          {m.titre}
                        </span>
                        <StatutMaintenanceBadge statut={m.statut} />
                        {m.necessite_approbation && !m.approuve_par && (
                          <span className="badge badge-warning text-xs">
                            ⏳ Approbation requise
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                        <span className="capitalize">
                          {m.type_operation?.replace(/_/g, " ")}
                        </span>
                        {m.fournisseur && <span>· {m.fournisseur.nom}</span>}
                        {m.kilometrage && (
                          <span>· {formatKm(m.kilometrage)}</span>
                        )}
                        <span>· {formatDate(m.date_travaux)}</span>
                      </div>
                    </div>

                    {/* Montant */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-sm text-gray-900">
                        {formatCfa(m.montant_ttc)}
                      </div>
                      {m.date_sortie && (
                        <div className="text-xs text-gray-400">
                          Sortie {formatDate(m.date_sortie)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total */}
                {maints.data.length > 0 && (
                  <div className="flex justify-end pt-3 border-t border-gray-100">
                    <div className="text-right">
                      <span className="text-xs text-gray-500 mr-2">
                        Total interventions :
                      </span>
                      <span className="font-bold text-primary-700">
                        {formatCfa(
                          maints.data.reduce(
                            (sum: number, m: any) =>
                              sum + (Number(m.montant_ttc) || 0),
                            0,
                          ),
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CARBURANT */}
        {tab === "carburant" && (
          <div>
            {/* En-tête */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {carbu?.data ? `${carbu.data.length} ravitaillement(s)` : ""}
              </h3>
              <button
                onClick={() => setCarbuModal(true)}
                className="btn gap-1.5 btn-sm bg-purple-700 text-white hover:bg-purple-800"
              >
                <Fuel size={14} /> Saisir un plein
              </button>
            </div>

            {lCarbu ? (
              <CardLoading rows={4} />
            ) : !carbu?.data || carbu.data.length === 0 ? (
              <div className="text-center py-12">
                <Fuel size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium mb-1">
                  Aucune consommation enregistrée
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Enregistrez les pleins pour suivre la consommation.
                </p>
                <button
                  onClick={() => setCarbuModal(true)}
                  className="btn bg-purple-700 text-white hover:bg-purple-800 gap-2"
                >
                  <Fuel size={15} /> Saisir le premier plein
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* En-tête colonnes */}
                <div className="grid grid-cols-5 px-4 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <span>Date</span>
                  <span>Station</span>
                  <span className="text-right">Litres</span>
                  <span className="text-right">Conso</span>
                  <span className="text-right">Montant</span>
                </div>

                {carbu.data.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => setCarbuDetail(c)}
                    className="grid grid-cols-5 items-center px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-purple-50 hover:border-purple-200 transition-colors cursor-pointer"
                  >
                    {/* Date + badge plein partiel */}
                    <div>
                      <div className="text-sm text-gray-700">
                        {formatDate(c.date)}
                      </div>
                      {!c.est_complet && (
                        <span className="text-xs text-yellow-600 font-medium">
                          Partiel
                        </span>
                      )}
                    </div>

                    {/* Station */}
                    <div className="text-sm text-gray-600 truncate">
                      {c.station ?? "—"}
                    </div>

                    {/* Litres */}
                    <div className="text-right">
                      <span className="font-mono text-sm text-gray-900 font-medium">
                        {c.litres} L
                      </span>
                      {c.prix_unitaire && (
                        <div className="text-xs text-gray-400">
                          {c.prix_unitaire.toLocaleString("fr-SN")} /L
                        </div>
                      )}
                    </div>

                    {/* Conso */}
                    <div className="text-right">
                      {c.conso_100km ? (
                        <span
                          className={`text-sm font-medium ${
                            c.conso_100km > 15
                              ? "text-red-600"
                              : c.conso_100km > 10
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        >
                          {c.conso_100km} L/100
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>

                    {/* Montant */}
                    <div className="text-right">
                      <span className="font-semibold text-sm text-gray-900">
                        {formatCfa(c.montant)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Totaux */}
                <div className="grid grid-cols-5 px-4 py-3 bg-purple-50 rounded-xl border border-purple-100 font-semibold text-sm">
                  <span className="text-purple-700 col-span-2">Total</span>
                  <span className="text-right text-purple-700 font-mono">
                    {carbu.data
                      .reduce(
                        (s: number, c: any) => s + (Number(c.litres) || 0),
                        0,
                      )
                      .toFixed(1)}{" "}
                    L
                  </span>
                  <span className="text-right text-gray-400 text-xs self-center">
                    {(() => {
                      const avecConso = carbu.data.filter(
                        (c: any) => c.conso_100km != null,
                      );
                      if (avecConso.length === 0) return "—";
                      const moy =
                        avecConso.reduce(
                          (s: number, c: any) =>
                            s + (Number(c.conso_100km) || 0),
                          0,
                        ) / avecConso.length;
                      return moy.toFixed(1) + " L/100";
                    })()}
                  </span>
                  <span className="text-right text-purple-700">
                    {formatCfa(
                      carbu.data.reduce(
                        (s: number, c: any) => s + (Number(c.montant) || 0),
                        0,
                      ),
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PNEUMATIQUES */}
        {tab === "pneumatiques" && (
          <div>
            {/* En-tête */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {pneus?.data ? `${pneus.data.length} opération(s)` : ""}
              </h3>
              <button
                onClick={() => setPneuModal(true)}
                className="btn gap-1.5 btn-sm bg-gray-700 text-white hover:bg-gray-800"
              >
                <CircleDot size={14} /> Nouvelle opération
              </button>
            </div>

            {lPneus ? (
              <CardLoading rows={4} />
            ) : !pneus?.data || pneus.data.length === 0 ? (
              <div className="text-center py-12">
                <CircleDot size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium mb-1">
                  Aucune opération pneumatique
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Enregistrez les achats, rotations, rechapages et réformes de
                  pneus.
                </p>
                <button
                  onClick={() => setPneuModal(true)}
                  className="btn bg-gray-700 text-white hover:bg-gray-800 gap-2"
                >
                  <CircleDot size={15} /> Enregistrer la première opération
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* En-tête colonnes */}
                <div className="grid grid-cols-6 px-4 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <span>Date</span>
                  <span>Type</span>
                  <span>Position</span>
                  <span>Marque / Dim.</span>
                  <span className="text-right">Qté / Km</span>
                  <span className="text-right">Montant</span>
                </div>

                {pneus.data.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/pneumatiques/${p.id}`)}
                    className="grid grid-cols-6 items-center px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer"
                  >
                    <div className="text-sm text-gray-700">
                      {formatDate(p.date)}
                    </div>

                    <div>
                      <TypeOperationPneuBadge type={p.type_operation} />
                    </div>

                    <div className="text-sm text-gray-600 capitalize">
                      {p.position?.replace(/_/g, " ") ?? "—"}
                    </div>

                    <div>
                      <div className="text-sm text-gray-700">
                        {p.marque_pneu ?? "—"}
                      </div>
                      {p.dimension && (
                        <div className="text-xs text-gray-400">
                          {p.dimension}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-sm text-gray-900 font-medium">
                        {p.quantite}
                      </div>
                      {p.kilometrage && (
                        <div className="text-xs text-gray-400">
                          {formatKm(p.kilometrage)}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-semibold text-sm text-gray-900">
                        {formatCfa(p.montant_total)}
                      </span>
                      {p.fournisseur?.nom && (
                        <div className="text-xs text-gray-400 truncate">
                          {p.fournisseur.nom}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex items-center justify-between px-4 py-3 mt-2 bg-gray-100 rounded-xl">
                  <span className="text-sm font-medium text-gray-600">
                    Total des opérations affichées
                  </span>
                  <span className="font-bold text-gray-900">
                    {formatCfa(
                      pneus.data.reduce(
                        (s: number, p: any) =>
                          s + (Number(p.montant_total) || 0),
                        0,
                      ),
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHECKLISTS */}
        {tab === "checklists" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {checks?.data ? `${checks.data.length} checklist(s)` : ""}
              </h3>
              <button
                onClick={() => setChecklistModal(true)}
                className="btn-primary btn-sm gap-1.5"
              >
                <Plus size={14} /> Nouvelle checklist
              </button>
            </div>
            {lChecks ? (
              <CardLoading rows={4} />
            ) : !checks?.data || checks.data.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck
                  size={40}
                  className="mx-auto text-gray-200 mb-3"
                />
                <p className="text-gray-500 font-medium mb-1">
                  Aucune checklist
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Créez la première checklist pour ce véhicule.
                </p>
                <button
                  onClick={() => setChecklistModal(true)}
                  className="btn-primary gap-2"
                >
                  <Plus size={15} /> Créer une checklist
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {checks.data.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => setChecklistDetail(c)}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer"
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
                        <span className="font-semibold text-sm text-gray-900 capitalize">
                          {c.type_checklist?.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`badge ${
                            c.statut === "valide"
                              ? "badge-success"
                              : c.statut === "soumis"
                                ? "badge-info"
                                : c.statut === "rejete"
                                  ? "badge-danger"
                                  : "badge-gray"
                          }`}
                        >
                          {c.statut}
                        </span>
                        {c.nb_non_conformites > 0 && (
                          <span className="badge badge-warning">
                            {c.nb_non_conformites} non-conformité(s)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDate(c.date)}
                        {c.kilometrage && ` · ${formatKm(c.kilometrage)}`}
                        {c.chauffeur && ` · ${c.chauffeur.nom}`}
                      </div>
                    </div>
                    <span
                      className={`badge ${
                        c.resultat_global === "conforme"
                          ? "badge-success"
                          : c.resultat_global === "non_conforme"
                            ? "badge-danger"
                            : "badge-gray"
                      }`}
                    >
                      {c.resultat_global?.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SIGNALEMENTS */}
        {tab === "signalements" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {signaux?.data ? `${signaux.data.length} signalement(s)` : ""}
              </h3>
              <button
                onClick={() => setSignalementModal(true)}
                className="btn-danger btn-sm gap-1.5"
              >
                <AlertTriangle size={14} /> Nouveau signalement
              </button>
            </div>
            {lSignaux ? (
              <CardLoading rows={4} />
            ) : !signaux?.data || signaux.data.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle
                  size={40}
                  className="mx-auto text-gray-200 mb-3"
                />
                <p className="text-gray-500 font-medium mb-1">
                  Aucun signalement
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Signalez une panne, défaut ou anomalie.
                </p>
                <button
                  onClick={() => setSignalementModal(true)}
                  className="btn-danger gap-2"
                >
                  <AlertTriangle size={15} /> Créer un signalement
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {signaux.data.map((s: any) => (
                  <div
                    key={s.id}
                    onClick={() => setSignalementDetail(s)}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
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
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {s.titre}
                        </span>
                        <span
                          className={`badge ${
                            s.gravite === "critique"
                              ? "badge-danger"
                              : s.gravite === "haute"
                                ? "badge-danger"
                                : s.gravite === "moyenne"
                                  ? "badge-warning"
                                  : "badge-info"
                          }`}
                        >
                          {s.gravite}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
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
                              : s.statut === "maintenance_creee"
                                ? "badge-info"
                                : "badge-gray"
                      }`}
                    >
                      {s.statut?.replace(/_/g, " ")}
                    </span>
                    {/* Bouton créer maintenance — si pas encore liée */}
                    {s.statut !== "resolu" && !s.maintenance_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreeMaintFromSig(s);
                        }}
                        className="btn-warning btn-sm gap-1 flex-shrink-0"
                        title="Créer une maintenance depuis ce signalement"
                      >
                        <Wrench size={12} /> Maintenance
                      </button>
                    )}
                    {s.maintenance_id && (
                      <span className="badge badge-info flex-shrink-0 text-xs">
                        🔧 Maintenance liée
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AFFECTATIONS */}
        {tab === "affectations" && (
          <div className="space-y-5">
            {/* ── Chauffeur actif ── */}
            {vehicule.affectation_active ? (
              <div className="rounded-2xl border-2 border-success bg-green-50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-green-100 border-b border-green-200">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-success">
                      Affectation active
                    </span>
                    <span className="text-xs text-green-600">
                      Depuis{" "}
                      {formatDate(vehicule.affectation_active.date_debut)}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setCloturerAffectModal(vehicule.affectation_active)
                    }
                    className="btn-secondary btn-sm gap-1.5 border-green-300 text-green-700 hover:bg-green-200"
                  >
                    <Lock size={13} /> Clôturer
                  </button>
                </div>
                <div className="p-5 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 select-none">
                    {vehicule.affectation_active.chauffeur?.nom
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("") ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-lg font-bold text-gray-900 hover:text-primary-700 cursor-pointer transition-colors"
                      onClick={() => {
                        const cid = (vehicule.affectation_active as any)
                          ?.chauffeur?.id;
                        if (cid) navigate(`/chauffeurs/${cid}`);
                      }}
                    >
                      {vehicule.affectation_active.chauffeur?.nom ?? "—"}
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {(vehicule.affectation_active as any).chauffeur
                        ?.telephone && (
                        <a
                          href={`tel:${(vehicule.affectation_active as any).chauffeur.telephone}`}
                          className="text-sm text-primary-600 hover:underline"
                        >
                          📞{" "}
                          {
                            (vehicule.affectation_active as any).chauffeur
                              .telephone
                          }
                        </a>
                      )}
                      {vehicule.affectation_active.axe && (
                        <span className="text-sm text-gray-500">
                          🛣 Axe :{" "}
                          <strong>{vehicule.affectation_active.axe}</strong>
                        </span>
                      )}
                      <span className="text-sm text-gray-500 capitalize">
                        📋{" "}
                        {vehicule.affectation_active.type?.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                  {(vehicule.affectation_active as any).chauffeur?.id && (
                    <button
                      onClick={() =>
                        navigate(
                          `/chauffeurs/${(vehicule.affectation_active as any).chauffeur.id}`,
                        )
                      }
                      className="btn-secondary btn-sm flex-shrink-0"
                    >
                      Voir la fiche
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <ArrowLeftRight size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Aucune affectation active
                    </p>
                    <p className="text-xs text-gray-400">
                      Ce véhicule n'est pas affecté à un chauffeur.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAffectationModal(true)}
                  className="btn-primary btn-sm gap-1.5"
                >
                  <Plus size={14} /> Affecter
                </button>
              </div>
            )}

            {/* ── Historique ── */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Historique des affectations
                {affectas?.data && (
                  <span className="ml-2 text-gray-400 font-normal">
                    ({affectas.data.length})
                  </span>
                )}
              </h3>
              {!vehicule.affectation_active && (
                <button
                  onClick={() => setAffectationModal(true)}
                  className="btn-secondary btn-sm gap-1.5"
                >
                  <Plus size={13} /> Nouvelle affectation
                </button>
              )}
            </div>

            {lAffectas ? (
              <CardLoading rows={4} />
            ) : !affectas?.data || affectas.data.length === 0 ? (
              <div className="text-center py-10">
                <ArrowLeftRight
                  size={36}
                  className="mx-auto text-gray-200 mb-2"
                />
                <p className="text-gray-400 text-sm">
                  Aucune affectation enregistrée.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {affectas.data.map((a: any) => {
                  const isActive = a.statut === "active";
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                        isActive
                          ? "bg-green-50 border-green-200"
                          : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                      }`}
                    >
                      {/* Barre statut */}
                      <div
                        className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                          isActive
                            ? "bg-success"
                            : a.statut === "terminee"
                              ? "bg-gray-300"
                              : "bg-warning"
                        }`}
                      />

                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none ${
                          isActive
                            ? "bg-primary-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {a.chauffeur?.nom
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join("") ?? "?"}
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-semibold text-sm cursor-pointer hover:underline ${isActive ? "text-primary-700" : "text-gray-800"}`}
                            onClick={() =>
                              a.chauffeur_id &&
                              navigate(`/chauffeurs/${a.chauffeur_id}`)
                            }
                          >
                            {a.chauffeur?.nom ??
                              a.type_affectation?.replace(/_/g, " ") ??
                              "—"}
                          </span>
                          <span
                            className={`badge text-xs ${isActive ? "badge-success" : a.statut === "terminee" ? "badge-gray" : "badge-warning"}`}
                          >
                            {a.statut}
                          </span>
                          <span className="badge badge-gray text-xs capitalize">
                            {a.type_affectation?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                          <span>
                            {formatDate(a.date_debut)}
                            {" → "}
                            {a.date_fin ? (
                              formatDate(a.date_fin)
                            ) : (
                              <strong className="text-green-600">
                                En cours
                              </strong>
                            )}
                          </span>
                          {a.duree_jours != null && (
                            <span>· {a.duree_jours}j</span>
                          )}
                          {a.axe_livraison?.nom && (
                            <span>· {a.axe_livraison.nom}</span>
                          )}
                          {a.chauffeur?.telephone && (
                            <a
                              href={`tel:${a.chauffeur.telephone}`}
                              className="text-primary-500 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {a.chauffeur.telephone}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Km */}
                      <div className="text-right flex-shrink-0 min-w-[90px]">
                        {a.km_parcourus != null && (
                          <div className="font-mono text-sm font-semibold text-gray-700">
                            {formatKm(a.km_parcourus)}
                          </div>
                        )}
                        {a.kilometrage_debut != null && (
                          <div className="text-xs text-gray-400">
                            {formatKm(a.kilometrage_debut)}
                            {a.kilometrage_fin != null
                              ? ` → ${formatKm(a.kilometrage_fin)}`
                              : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Total km */}
                {affectas.data.length > 0 && (
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100 px-1">
                    <span className="text-xs text-gray-400">
                      {affectas.data.length} affectation(s) · total km parcourus
                    </span>
                    <span className="font-bold text-primary-700 text-sm">
                      {formatKm(
                        affectas.data.reduce(
                          (s: number, a: any) =>
                            s + (Number(a.km_parcourus) || 0),
                          0,
                        ),
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TCO */}
        {tab === "tco" &&
          (lTco ? (
            <CardLoading rows={4} />
          ) : !tco ? (
            <EmptyState
              title="Données TCO indisponibles"
              description="Aucune donnée de coût enregistrée pour ce véhicule."
            />
          ) : (
            (() => {
              // ── Calcul des postes réels ─────────────────────────────
              // Backend retourne :
              //   postes.entretien/reparation/carrosserie/equipement = sous-détails de total_maintenance
              //   postes.pneus    = total_pneus    (table pneumatiques)
              //   postes.carburant= total_carburant (table carburants)
              //   total_global    = total_maintenance + total_pneus + total_carburant
              //
              // Pour les barres de progression, on utilise les 6 postes feuilles
              // et on calcule le total comme somme de ces 6 postes (= total_global).
              const postes = [
                {
                  label: "Entretien",
                  value: Number(tco.postes?.entretien) || 0,
                  color: "bg-blue-500",
                },
                {
                  label: "Réparations",
                  value: Number(tco.postes?.reparation) || 0,
                  color: "bg-red-500",
                },
                {
                  label: "Carrosserie",
                  value: Number(tco.postes?.carrosserie) || 0,
                  color: "bg-orange-500",
                },
                {
                  label: "Équipement",
                  value: Number(tco.postes?.equipement) || 0,
                  color: "bg-yellow-500",
                },
                {
                  label: "Visite technique",
                  value: Number(tco.postes?.visite_technique) || 0,
                  color: "bg-cyan-500",
                },
                {
                  label: "Contravention",
                  value: Number(tco.postes?.contravention) || 0,
                  color: "bg-pink-500",
                },
                {
                  label: "Pneus",
                  value: Number(tco.postes?.pneus) || 0,
                  color: "bg-gray-500",
                },
                {
                  label: "Carburant",
                  value: Number(tco.postes?.carburant) || 0,
                  color: "bg-purple-500",
                },
              ];

              // Somme des postes feuilles = doit être égale à total_global
              const sommePosetes = postes.reduce((s, p) => s + p.value, 0);

              // Utiliser total_global du backend comme référence — s'il est cohérent avec
              // la somme des postes, on l'affiche. Sinon on affiche la somme calculée.
              const totalAffiche = Number(tco.total_global) || sommePosetes;

              return (
                <div className="space-y-5">
                  {/* Sélecteur année */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Coût total de possession — {tco.annee}
                    </h3>
                    <select
                      value={tcoAnnee}
                      onChange={(e) => setTcoAnnee(parseInt(e.target.value))}
                      className="input h-8 py-0 text-sm w-24"
                    >
                      {Array.from(
                        { length: 4 },
                        (_, i) => new Date().getFullYear() - i,
                      ).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Alerte doublon pneus */}
                  {tco.alerte_doublon_pneus_possible && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                      ⚠️ Des opérations pneus existent à la fois dans{" "}
                      <strong>Maintenance</strong> (legacy,{" "}
                      {Number(tco.legacy_pneu_maintenance).toLocaleString(
                        "fr-FR",
                      )}{" "}
                      FCFA non comptés dans le TCO) et dans le module{" "}
                      <strong>Pneumatiques</strong>. Vérifiez qu'il ne s'agit
                      pas de doublons et privilégiez le module Pneumatiques pour
                      les futures saisies.
                    </div>
                  )}

                  {/* KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {
                        label: "Interventions",
                        value: String(tco.nb_interventions ?? 0),
                        unit: "",
                        color: "text-primary-700",
                      },
                      {
                        label: "Coût/km",
                        value: String(tco.cout_par_km ?? "—"),
                        unit: " FCFA/km",
                        color: "text-gray-900",
                      },
                      {
                        label: "Km parcourus",
                        value: tco.km_parcourus
                          ? Number(tco.km_parcourus).toLocaleString("fr-SN")
                          : "—",
                        unit: " km",
                        color: "text-gray-900",
                      },
                      // Correction : champ backend = conso_100km (pas conso_100km_moyen)
                      {
                        label: "Conso moy.",
                        value: String(
                          tco.conso_100km ?? tco.conso_100km_moyen ?? "—",
                        ),
                        unit: " L/100km",
                        color: "text-gray-900",
                      },
                    ].map(({ label, value, unit, color }) => (
                      <div
                        key={label}
                        className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center"
                      >
                        <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                          {label}
                        </dt>
                        <dd className={`text-xl font-bold ${color}`}>
                          {value}
                          {value !== "—" ? unit : ""}
                        </dd>
                      </div>
                    ))}
                  </div>

                  {/* Répartition des coûts */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Répartition des coûts
                      </h4>
                      <span className="text-xs text-gray-400">
                        {postes.filter((p) => p.value > 0).length} poste(s)
                        actif(s)
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {postes
                        .filter((p) => p.value > 0) // masquer les postes à 0
                        .map(({ label, value, color }) => {
                          // % calculé sur la somme réelle des postes feuilles
                          const pct =
                            sommePosetes > 0
                              ? Math.round((value / sommePosetes) * 100)
                              : 0;
                          return (
                            <div
                              key={label}
                              className="flex items-center gap-3"
                            >
                              <span className="text-xs text-gray-500 w-24 flex-shrink-0">
                                {label}
                              </span>
                              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${color} transition-all duration-500`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-700 w-28 text-right tabular-nums">
                                {formatCfa(value)}
                              </span>
                              <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
                                {pct}%
                              </span>
                            </div>
                          );
                        })}

                      {/* Ligne séparatrice + vérification cohérence */}
                      <div className="pt-2 border-t border-gray-100 flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-600 w-24 flex-shrink-0">
                          Total
                        </span>
                        <div className="flex-1" />
                        <span className="text-xs font-bold text-gray-900 w-28 text-right tabular-nums">
                          {formatCfa(sommePosetes)}
                        </span>
                        <span className="text-xs text-gray-400 w-8 text-right">
                          100%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total TCO — affiché = somme des postes feuilles */}
                  <div className="flex items-center justify-between p-4 bg-primary-50 rounded-xl border border-primary-200">
                    <div>
                      <span className="font-semibold text-primary-700">
                        TOTAL TCO {tco.annee}
                      </span>
                      <p className="text-xs text-primary-400 mt-0.5">
                        Maintenance + Pneus + Carburant
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-primary-700">
                      {formatCfa(totalAffiche)}
                    </span>
                  </div>
                </div>
              );
            })()
          ))}
      </div>
    </div>
  );
}
