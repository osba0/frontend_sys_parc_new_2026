import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, AlertTriangle, X, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signalementsApi, chauffeursApi } from "@/api/operations.api";
import { authApi } from "@/api/auth.api";
import DataTable, { type Column } from "@/components/shared/DataTable";
import PageHeader from "@/components/shared/PageHeader";
import { GraviteBadge } from "@/components/shared/StatutBadge";
import NewBadge from "@/components/shared/NewBadge";
import { CardLoading, LoadingSpinner } from "@/components/shared/LoadingPage";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/utils";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const TYPES_DEFAUT = [
  { value: "panne_moteur", label: "Panne moteur", icon: "🔴" },
  { value: "probleme_freins", label: "Freins", icon: "🛑" },
  { value: "probleme_pneu", label: "Pneu", icon: "⬤" },
  { value: "probleme_electrique", label: "Électrique", icon: "⚡" },
  { value: "probleme_carrosserie", label: "Carrosserie", icon: "🚗" },
  { value: "probleme_eclairage", label: "Éclairage", icon: "💡" },
  { value: "fuite", label: "Fuite", icon: "💧" },
  { value: "surchauffe", label: "Surchauffe", icon: "🌡" },
  { value: "bruit_anormal", label: "Bruit anormal", icon: "🔊" },
  { value: "autre", label: "Autre", icon: "❓" },
];

const GRAVITE_CONFIG = {
  faible: { cls: "border-blue-400 bg-blue-50 text-blue-700", label: "Faible" },
  moyenne: {
    cls: "border-yellow-400 bg-yellow-50 text-yellow-700",
    label: "Moyenne",
  },
  haute: {
    cls: "border-orange-400 bg-orange-50 text-orange-700",
    label: "Haute",
  },
  critique: { cls: "border-red-500 bg-red-50 text-red-700", label: "Critique" },
} as const;

// ─────────────────────────────────────────────────────────────
// Modal — Nouveau signalement (chauffeur)
// ─────────────────────────────────────────────────────────────

function NouveauSignalementModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();
  const c = user?.chauffeur;

  // Utiliser /auth/me pour récupérer les données fraîches — le chauffeur
  // a toujours accès à cet endpoint (pas de restriction de permission)
  const { data: meData } = useQuery({
    queryKey: ["me-vehicules-actifs"],
    queryFn: () =>
      authApi.me().then((r) => {
        setUser(r.data.data); // met aussi à jour le store
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
  const vehiculeActif =
    vehiculesActifs.find((v) => v.vehicule_id === vehiculeSelectionne) ??
    vehiculesActifs[0];

  const [typeDefaut, setTypeDefaut] = useState("panne_moteur");
  const [gravite, setGravite] =
    useState<keyof typeof GRAVITE_CONFIG>("moyenne");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Synchroniser vehiculeSelectionne quand vehiculesActifs charge depuis l'API
  useEffect(() => {
    if (vehiculesActifs.length > 0 && !vehiculeSelectionne) {
      setVehiculeSelectionne(vehiculesActifs[0].vehicule_id);
    }
  }, [vehiculesActifs.length]); // eslint-disable-line

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const valides = Array.from(files).filter((f) => {
      if (!allowed.includes(f.type)) {
        toast.error(`${f.name} : format non supporté.`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} : trop volumineux (max 5 Mo).`);
        return false;
      }
      return true;
    });
    setPhotos((prev) => [...prev, ...valides].slice(0, 5)); // max 5 photos
  };

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => {
      // 1. Créer le signalement
      const res = await signalementsApi.create(
        Object.fromEntries(fd.entries()),
      );
      // 2. Upload photos si présentes
      if (photos.length > 0) {
        const photoFd = new FormData();
        photos.forEach((p) => photoFd.append("photos[]", p, p.name));
        await signalementsApi.uploadPhotos((res.data as any).data.id, photoFd);
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signalements"] });
      toast.success("Signalement créé.");
      onClose();
    },
    onError: (err: any) => {
      const errs = err?.response?.data?.errors as
        | Record<string, string[]>
        | undefined;
      if (errs) {
        const m: Record<string, string> = {};
        Object.entries(errs).forEach(([k, v]) => {
          m[k] = v[0];
        });
        setErrors(m);
      } else {
        toast.error(err?.response?.data?.message ?? "Erreur.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!titre.trim()) errs.titre = "Titre obligatoire";
    if (description.trim().length < 10)
      errs.description = "Description trop courte (min 10 car.)";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    if (!vehiculeActif) {
      toast.error(
        "Aucun véhicule affecté. Impossible de créer un signalement.",
      );
      return;
    }

    const fd = new FormData();
    fd.append("vehicule_id", String(vehiculeActif.vehicule_id));
    fd.append("agence_id", String(user!.agence_id));
    fd.append("chauffeur_id", String(c!.id));
    fd.append("origine", "chauffeur");
    fd.append("type_defaut", typeDefaut);
    fd.append("gravite", gravite);
    fd.append("titre", titre.trim());
    fd.append("description", description.trim());
    fd.append("date_signalement", date);
    if (km) fd.append("kilometrage", km);

    mutation.mutate(fd);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 sm:rounded-none"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-danger px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Nouveau signalement
            </h3>
            {vehiculeActif && (
              <p className="text-red-200 text-xs mt-0.5">
                🚗 {vehiculeActif.immatriculation} —{" "}
                {vehiculeActif.marque_modele}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-red-200 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <form
          id="sig-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-5"
        >
          {/* Sélecteur véhicule si le chauffeur a plusieurs véhicules affectés */}
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
              ⚠ Aucun véhicule ne vous est affecté. Contactez votre responsable.
            </div>
          )}

          {/* Type de défaut */}
          <div>
            <label className="label">Type de défaut *</label>
            <div className="grid grid-cols-5 gap-1.5">
              {TYPES_DEFAUT.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTypeDefaut(t.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-medium transition-all ${
                    typeDefaut === t.value
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="text-center leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Gravité */}
          <div>
            <label className="label">Gravité *</label>
            <div className="grid grid-cols-4 gap-2">
              {(
                Object.entries(GRAVITE_CONFIG) as [
                  keyof typeof GRAVITE_CONFIG,
                  (typeof GRAVITE_CONFIG)[keyof typeof GRAVITE_CONFIG],
                ][]
              ).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGravite(key)}
                  className={`py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                    gravite === key ? cfg.cls : "border-gray-200 text-gray-500"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="label">Titre *</label>
            <input
              value={titre}
              onChange={(e) => {
                setTitre(e.target.value);
                setErrors((p) => ({ ...p, titre: "" }));
              }}
              className={`input ${errors.titre ? "input-error" : ""}`}
              placeholder="Ex : Voyant moteur allumé, perte de puissance"
            />
            {errors.titre && <p className="error-msg">{errors.titre}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label">Description *</label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((p) => ({ ...p, description: "" }));
              }}
              rows={3}
              className={`input resize-none ${errors.description ? "input-error" : ""}`}
              placeholder="Décrivez précisément le défaut constaté, les circonstances…"
            />
            {errors.description && (
              <p className="error-msg">{errors.description}</p>
            )}
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

          {/* Photos */}
          <div>
            <label className="label">
              Photos
              <span className="text-gray-400 font-normal ml-1">
                (optionnel — max 5 · 5 Mo chacune)
              </span>
            </label>
            <div
              onClick={() =>
                document.getElementById("sig-photos-input")?.click()
              }
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-red-300 hover:bg-red-50 transition-all text-center"
            >
              <AlertTriangle size={20} className="mx-auto text-gray-300 mb-1" />
              <p className="text-sm text-gray-500">
                Cliquer pour ajouter des photos du défaut
              </p>
              <p className="text-xs text-gray-400 mt-0.5">JPG · PNG · WebP</p>
            </div>
            <input
              id="sig-photos-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePhotos(e.target.files)}
            />

            {/* Aperçu photos */}
            {photos.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {photos.map((p, i) => (
                  <div key={i} className="relative">
                    <img
                      src={URL.createObjectURL(p)}
                      alt={p.name}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              form="sig-form"
              disabled={mutation.isPending || !c?.vehicule_actuel}
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
// Page liste
// ─────────────────────────────────────────────────────────────

export default function SignalementListPage() {
  const navigate = useNavigate();
  const { role, user, hasRole } = useAuthStore();
  const isChauffeur = hasRole("chauffeur", "attributaire");
  const peutCreer = hasRole(
    "super_admin",
    "directeur",
    "resp_parc",
    "resp_agence",
    "chauffeur",
    "attributaire",
  );
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState("");
  const [gravite, setGravite] = useState("");
  const [newModal, setNewModal] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["signalements", { page, statut, gravite, isChauffeur }],
    queryFn: () =>
      signalementsApi
        .list({
          page,
          per_page: 25,
          sort: "-date_signalement",
          include: "vehicule,chauffeur",
          "filter[statut]": statut || undefined,
          "filter[gravite]": gravite || undefined,
          // Le scope chauffeur est aussi appliqué côté backend
          // On l'envoie aussi en filtre pour clarté
          ...(isChauffeur && user?.chauffeur?.id
            ? { "filter[chauffeur_id]": String(user.chauffeur.id) }
            : {}),
        })
        .then((r) => r.data),
  });

  const columns: Column<any>[] = [
    {
      key: "titre",
      header: "Signalement",
      render: (s) => (
        <div>
          <div className="font-medium text-gray-900 flex items-center gap-1.5">
            {s.titre}
            <NewBadge createdAt={s.created_at} />
          </div>
          <div className="text-xs text-gray-500 capitalize">
            {s.type_defaut?.replace(/_/g, " ")}
          </div>
        </div>
      ),
    },
    {
      key: "vehicule",
      header: "Véhicule",
      render: (s) => (
        <span className="font-mono text-primary-700 font-semibold text-sm">
          {s.vehicule?.immatriculation ?? "—"}
        </span>
      ),
    },
    {
      key: "gravite",
      header: "Gravité",
      render: (s) => <GraviteBadge gravite={s.gravite} />,
    },
    {
      key: "statut",
      header: "Statut",
      render: (s) => (
        <span
          className={`badge ${
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
          {s.statut.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "date_signalement",
      header: "Date",
      render: (s) => formatDate(s.date_signalement),
    },
    // Colonne chauffeur masquée pour le chauffeur lui-même
    ...(!isChauffeur
      ? [
          {
            key: "chauffeur",
            header: "Chauffeur",
            render: (s: any) => s.chauffeur?.nom ?? "—",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {newModal && (
        <NouveauSignalementModal onClose={() => setNewModal(false)} />
      )}

      <PageHeader
        title={isChauffeur ? "Mes signalements" : "Signalements"}
        subtitle={`${data?.meta?.total ?? 0} signalement(s)`}
        actions={
          !peutCreer ? undefined : isChauffeur ? (
            <button
              onClick={() => setNewModal(true)}
              className="btn-danger gap-2"
            >
              <AlertTriangle size={16} /> Signaler un défaut
            </button>
          ) : (
            <button
              onClick={() => navigate("/signalements/nouveau")}
              className="btn-danger gap-2"
            >
              <Plus size={16} /> Nouveau signalement
            </button>
          )
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
        rowKey={(s) => s.id}
        onRowClick={(s) => navigate(`/signalements/${s.id}`)}
        emptyTitle="Aucun signalement"
        emptyDescription={
          isChauffeur
            ? "Aucun signalement de votre part. Signalez tout défaut constaté sur votre véhicule."
            : "Aucun signalement enregistré."
        }
        filters={
          <div className="flex flex-wrap gap-2">
            <select
              value={statut}
              onChange={(e) => {
                setStatut(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-44"
            >
              <option value="">Tous statuts</option>
              <option value="nouveau">Nouveau</option>
              <option value="en_cours">En cours</option>
              <option value="maintenance_creee">Maintenance créée</option>
              <option value="resolu">Résolu</option>
            </select>
            <select
              value={gravite}
              onChange={(e) => {
                setGravite(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-36"
            >
              <option value="">Toutes gravités</option>
              <option value="critique">Critique</option>
              <option value="haute">Haute</option>
              <option value="moyenne">Moyenne</option>
              <option value="faible">Faible</option>
            </select>
          </div>
        }
      />
    </div>
  );
}
