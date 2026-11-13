import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X, FileText, Camera } from "lucide-react";
import {
  useChauffeur,
  useCreateChauffeur,
  useUpdateChauffeur,
  useAgences,
} from "@/hooks";
import type { Chauffeur } from "@/types";
import PageHeader from "@/components/shared/PageHeader";
import {
  CardLoading,
  ErrorState,
  LoadingSpinner,
} from "@/components/shared/LoadingPage";
import { mediaUrl } from "@/utils";
import { ChauffeurAvatar } from "@/components/shared/ChauffeurAvatar";

// ── Schéma Zod ────────────────────────────────────────────────
const schema = z.object({
  agence_id: z.coerce.number().min(1, "Agence obligatoire"),
  nom: z.string().min(1, "Nom obligatoire").max(100),
  prenom: z.string().min(1, "Prénom obligatoire").max(100),
  telephone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  date_naissance: z.string().optional().or(z.literal("")),
  adresse: z.string().max(255).optional().or(z.literal("")),
  cni: z.string().max(50).optional().or(z.literal("")),
  matricule_interne: z.string().max(50).optional().or(z.literal("")),
  date_embauche: z.string().optional().or(z.literal("")),
  statut: z.enum(["actif", "suspendu", "conge", "quitte"]).optional(),
  numero_permis: z.string().max(50).optional().or(z.literal("")),
  categorie_permis: z
    .enum(["A", "B", "C", "D", "E", "BE", "CE", "DE"])
    .optional()
    .or(z.literal("")),
  date_delivrance_permis: z.string().optional().or(z.literal("")),
  date_expiration_permis: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

// ── Composant champ ───────────────────────────────────────────
function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
// ── Composant upload photo profil ────────────────────────────

function PhotoProfilUpload({
  preview,
  onChange,
  onRemove,
}: {
  preview: string | null;
  onChange: (f: File | null) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <div
        className="w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary-400 cursor-pointer transition-colors bg-gray-50 flex items-center justify-center"
        onClick={() => fileRef.current?.click()}
      >
        {preview ? (
          <img
            src={preview}
            alt="Photo profil"
            className="w-full h-full object-cover"
          />
        ) : (
          <Camera size={20} className="text-gray-300" />
        )}
      </div>
      {preview && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
        >
          <X size={10} />
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onChange(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function ChauffeurFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const chauffeurId = id ? parseInt(id) : 0;

  // ── Données distantes ─────────────────────────────────────
  const {
    data: chauffeur,
    isLoading: loadingChauffeur,
    error: errorChauffeur,
  } = useChauffeur(isEdit ? chauffeurId : undefined);

  const { data: agences = [], isLoading: loadingAgences } = useAgences();

  // ── Mutations — déclarées UNE SEULE FOIS ─────────────────
  const createMut = useCreateChauffeur();
  const updateMut = useUpdateChauffeur(chauffeurId);

  // ── État photo permis ─────────────────────────────────────
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // ── État photo de profil ──────────────────────────────────
  const [photoProfilFile, setPhotoProfilFile] = useState<File | null>(null);
  const [photoProfilPreview, setPhotoProfilPreview] = useState<string | null>(
    null,
  );
  const photoProfil = {
    file: photoProfilFile,
    preview: photoProfilPreview,
    setFile: (f: File | null) => {
      setPhotoProfilFile(f);
      setPhotoProfilPreview(f ? URL.createObjectURL(f) : null);
    },
    remove: () => {
      setPhotoProfilFile(null);
      setPhotoProfilPreview(null);
    },
  };

  // ── État compte applicatif (création uniquement) ──────────
  const [creerCompte, setCreerCompte] = useState(false);
  const [comptePassword, setComptePassword] = useState("");
  const [comptePassword2, setComptePassword2] = useState("");
  const [compteFonction, setCompteFonction] = useState("");
  const [compteError, setCompteError] = useState("");

  const handlePhotoFile = (file: File | null) => {
    if (!file) return;
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      alert("Format non supporté. Utilisez JPG, PNG ou PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    setPhotoFile(file);
    if (file.type !== "application/pdf") {
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  // ── Formulaire ────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { statut: "actif" },
  });

  const watchedEmail = watch("email");

  useEffect(() => {
    if (chauffeur && isEdit) {
      reset({
        agence_id: chauffeur.agence_id,
        nom: chauffeur.nom,
        prenom: chauffeur.prenom,
        telephone: chauffeur.telephone ?? "",
        email: chauffeur.email ?? "",
        date_naissance: chauffeur.date_naissance ?? "",
        adresse: chauffeur.adresse ?? "",
        cni: chauffeur.cni ?? "",
        matricule_interne: chauffeur.matricule_interne ?? "",
        date_embauche: chauffeur.date_embauche ?? "",
        statut: chauffeur.statut,
        numero_permis: chauffeur.numero_permis ?? "",
        categorie_permis: (chauffeur.categorie_permis as any) ?? "",
        date_delivrance_permis: chauffeur.date_delivrance_permis ?? "",
        date_expiration_permis: chauffeur.date_expiration_permis ?? "",
        notes: chauffeur.notes ?? "",
      });
      // Pré-charger la photo de profil existante
      if (chauffeur.photo_profil_url) {
        setPhotoProfilPreview(chauffeur.photo_profil_url);
      }
    }
  }, [chauffeur, isEdit, reset]);

  // ── Soumission ────────────────────────────────────────────
  const onSubmit = async (data: FormValues) => {
    // Validation du compte si demandé
    if (
      creerCompte &&
      (!isEdit || (isEdit && chauffeur && !chauffeur.a_un_compte))
    ) {
      if (!comptePassword) {
        setCompteError("Mot de passe obligatoire.");
        return;
      }
      if (comptePassword.length < 8) {
        setCompteError("Minimum 8 caractères.");
        return;
      }
      if (comptePassword !== comptePassword2) {
        setCompteError("Les mots de passe ne correspondent pas.");
        return;
      }
      setCompteError("");
    }

    // Construire le FormData multipart
    // IMPORTANT : PHP/Laravel ne parse pas le body d'un PUT multipart.
    // Solution : envoyer en POST avec _method=PUT (method spoofing Laravel).
    const fd = new FormData();

    // Champs texte — ignorer les chaînes vides
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        fd.append(key, String(value));
      }
    });

    // Fichier photo — ajouté comme File binaire avec son nom d'origine
    if (photoFile) {
      fd.append("photo_permis", photoFile, photoFile.name);
    }
    if (photoProfilFile) {
      fd.append("photo_profil", photoProfilFile, photoProfilFile.name);
    }

    // Compte applicatif — création (mode édition aussi si pas encore de compte)
    if (
      creerCompte &&
      comptePassword &&
      (!isEdit || (isEdit && chauffeur && !chauffeur.a_un_compte))
    ) {
      fd.append("creer_compte", "1");
      fd.append("compte_password", comptePassword);
      if (compteFonction) fd.append("compte_fonction", compteFonction);
    }

    if (isEdit) {
      // Method spoofing : Laravel intercepte _method=PUT dans le body FormData
      fd.append("_method", "PUT");
      await updateMut.mutateAsync(fd as any);
      navigate(`/chauffeurs/${id}`);
    } else {
      const res = await createMut.mutateAsync(fd as any);
      // Naviguer vers le détail pour voir la photo immédiatement
      const createdId = (res as any)?.data?.data?.id;
      navigate(createdId ? `/chauffeurs/${createdId}` : "/chauffeurs");
    }
  };

  // ── Gardes de rendu ───────────────────────────────────────
  if (isEdit && loadingChauffeur) {
    return (
      <div className="card p-6">
        <CardLoading rows={8} />
      </div>
    );
  }
  if (isEdit && errorChauffeur) {
    return <ErrorState message="Chauffeur non trouvé." onRetry={() => {}} />;
  }

  const mutError = (createMut.error || updateMut.error) as any;

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title={
          isEdit
            ? `Modifier — ${chauffeur?.nom_complet ?? ""}`
            : "Nouveau chauffeur"
        }
        backTo={isEdit ? `/chauffeurs/${id}` : "/chauffeurs"}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Identité ── */}
        <div className="card p-6">
          <h3 className="section-title">Identité</h3>

          {/* Photo de profil — optionnelle */}
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
            <PhotoProfilUpload
              preview={photoProfil.preview}
              onChange={photoProfil.setFile}
              onRemove={photoProfil.remove}
            />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Photo de profil
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Optionnelle · JPG, PNG, WEBP · max 3 Mo
              </p>
              {photoProfil.file && (
                <p className="text-xs text-primary-600 mt-1 font-medium">
                  ✓ {photoProfil.file.name}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Agence" required error={errors.agence_id?.message}>
              <select
                {...register("agence_id")}
                className="input"
                disabled={loadingAgences}
              >
                <option value="">-- Sélectionner --</option>
                {agences.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.nom}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Matricule interne"
              error={errors.matricule_interne?.message}
            >
              <input
                {...register("matricule_interne")}
                className="input"
                placeholder="MAT-001"
              />
            </Field>

            <Field label="Nom" required error={errors.nom?.message}>
              <input
                {...register("nom")}
                className="input"
                placeholder="DIALLO"
              />
            </Field>

            <Field label="Prénom" required error={errors.prenom?.message}>
              <input
                {...register("prenom")}
                className="input"
                placeholder="Mamadou"
              />
            </Field>

            <Field label="Téléphone" error={errors.telephone?.message}>
              <input
                {...register("telephone")}
                className="input"
                placeholder="+221 77 000 00 00"
              />
            </Field>

            <Field label="Email" error={errors.email?.message}>
              <input {...register("email")} type="email" className="input" />
            </Field>

            <Field
              label="Date de naissance"
              error={errors.date_naissance?.message}
            >
              <input
                {...register("date_naissance")}
                type="date"
                className="input"
              />
            </Field>

            <Field
              label="Date d'embauche"
              error={errors.date_embauche?.message}
            >
              <input
                {...register("date_embauche")}
                type="date"
                className="input"
              />
            </Field>

            <Field label="CNI" error={errors.cni?.message}>
              <input
                {...register("cni")}
                className="input"
                placeholder="1 23 45 678 901"
              />
            </Field>

            {/* Statut — édition uniquement */}
            {isEdit && (
              <Field label="Statut" error={errors.statut?.message}>
                <select {...register("statut")} className="input">
                  <option value="actif">Actif</option>
                  <option value="suspendu">Suspendu</option>
                  <option value="conge">En congé</option>
                  <option value="quitte">Quitté</option>
                </select>
              </Field>
            )}
          </div>

          <div className="mt-4">
            <Field label="Adresse" error={errors.adresse?.message}>
              <input
                {...register("adresse")}
                className="input"
                placeholder="Quartier, ville…"
              />
            </Field>
          </div>
        </div>

        {/* ── Permis de conduire ── */}
        <div className="card p-6">
          <h3 className="section-title">Permis de conduire</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="N° permis" error={errors.numero_permis?.message}>
              <input {...register("numero_permis")} className="input" />
            </Field>

            <Field label="Catégorie" error={errors.categorie_permis?.message}>
              <select {...register("categorie_permis")} className="input">
                <option value="">— Sélectionner —</option>
                {["A", "B", "C", "D", "E", "BE", "CE", "DE"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Date de délivrance"
              error={errors.date_delivrance_permis?.message}
            >
              <input
                {...register("date_delivrance_permis")}
                type="date"
                className="input"
              />
            </Field>

            <Field
              label="Date d'expiration"
              error={errors.date_expiration_permis?.message}
            >
              <input
                {...register("date_expiration_permis")}
                type="date"
                className="input"
              />
            </Field>
          </div>
        </div>

        {/* ── Photo du permis ── */}
        <div className="card p-6">
          <h3 className="section-title">Photo / Scan du permis</h3>
          <p className="text-xs text-gray-400 mb-3">
            JPG · PNG · PDF — max 10 Mo
          </p>

          {/* Zone drag-and-drop */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handlePhotoFile(e.dataTransfer.files[0] ?? null);
            }}
            onClick={() =>
              document.getElementById("photo-permis-input")?.click()
            }
            className={`border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all ${
              dragOver
                ? "border-primary-400 bg-primary-50"
                : photoFile || chauffeur?.photo
                  ? "border-green-400 bg-green-50"
                  : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
            }`}
          >
            {/* Prévisualisation image nouvelle ou existante */}
            {(photoPreview || (chauffeur?.photo && !photoFile)) && (
              <div className="flex justify-center mb-3">
                <img
                  src={photoPreview ?? mediaUrl(chauffeur?.photo) ?? ""}
                  alt="Permis"
                  className="max-h-40 rounded-lg object-contain border border-gray-200 shadow-sm"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              </div>
            )}

            {photoFile ? (
              /* Fichier sélectionné */
              <div className="flex items-center justify-center gap-3 text-green-700">
                <FileText size={20} />
                <span className="text-sm font-medium truncate max-w-xs">
                  {photoFile.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="text-red-400 hover:text-red-600 transition-colors ml-1"
                >
                  <X size={16} />
                </button>
              </div>
            ) : chauffeur?.photo ? (
              /* Photo existante — mode édition */
              <div className="text-center">
                <p className="text-sm font-medium text-green-700 mb-0.5">
                  Photo enregistrée
                </p>
                <p className="text-xs text-primary-600">
                  Cliquer ou glisser pour remplacer
                </p>
              </div>
            ) : (
              /* Aucune photo */
              <div className="text-center">
                <Upload size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">
                  Glisser-déposer ou{" "}
                  <span className="text-primary-600 font-medium">
                    parcourir
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Input fichier caché */}
          <input
            id="photo-permis-input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={(e) => handlePhotoFile(e.target.files?.[0] ?? null)}
          />

          {/* Lien vers la photo actuelle en édition */}
          {chauffeur?.photo && !photoFile && (
            <a
              href={mediaUrl(chauffeur.photo) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-2 text-xs text-primary-600 hover:underline"
            >
              Voir la photo actuelle →
            </a>
          )}
        </div>

        {/* ── Compte applicatif ── */}
        {/* Création : toujours proposé | Édition : seulement si pas encore de compte */}
        {(!isEdit || (isEdit && chauffeur && !chauffeur.a_un_compte)) && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="section-title mb-0 border-0 pb-0">
                  Compte applicatif
                </h3>
                {isEdit && (
                  <p className="text-xs text-orange-600 mt-0.5">
                    ⚠ Ce chauffeur n'a pas de compte — il ne peut pas se
                    connecter.
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={creerCompte}
                  onChange={(e) => {
                    setCreerCompte(e.target.checked);
                    setComptePassword("");
                    setComptePassword2("");
                    setCompteError("");
                  }}
                  className="w-4 h-4 accent-primary-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  {isEdit
                    ? "Créer un compte maintenant"
                    : "Créer un compte de connexion"}
                </span>
              </label>
            </div>

            {!creerCompte ? (
              <p className="text-xs text-gray-400 mt-1">
                {isEdit
                  ? "Cochez pour créer un compte et permettre au chauffeur de se connecter."
                  : "Sans compte, le chauffeur ne pourra pas se connecter à l'application."}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                  ℹ️ Le compte sera créé avec l'email du chauffeur et le rôle{" "}
                  <strong>Chauffeur</strong>. Il pourra se connecter pour
                  soumettre des checklists et signaler des pannes.
                </div>

                {/* Email récapitulatif — lecture seule */}
                <div>
                  <label className="label">Email de connexion</label>
                  <input
                    type="text"
                    readOnly
                    className="input bg-gray-50 text-gray-500 cursor-not-allowed"
                    value={
                      watchedEmail ||
                      chauffeur?.email ||
                      "— saisir l'email dans la section Identité —"
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Mot de passe *</label>
                    <input
                      type="password"
                      value={comptePassword}
                      onChange={(e) => {
                        setComptePassword(e.target.value);
                        setCompteError("");
                      }}
                      className={`input ${compteError ? "input-error" : ""}`}
                      placeholder="Min. 8 caractères"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="label">Confirmer le mot de passe *</label>
                    <input
                      type="password"
                      value={comptePassword2}
                      onChange={(e) => {
                        setComptePassword2(e.target.value);
                        setCompteError("");
                      }}
                      className={`input ${compteError ? "input-error" : ""}`}
                      placeholder="Répéter"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">
                    Fonction / Poste
                    <span className="text-gray-400 font-normal ml-1">
                      (optionnel)
                    </span>
                  </label>
                  <input
                    value={compteFonction}
                    onChange={(e) => setCompteFonction(e.target.value)}
                    className="input"
                    placeholder="Chauffeur livreur, Chauffeur VIP, Conducteur…"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Stockée dans le compte utilisateur — visible dans
                    l'administration.
                  </p>
                </div>

                {compteError && <p className="error-msg">{compteError}</p>}
              </div>
            )}
          </div>
        )}

        {/* ── Notes ── */}
        <div className="card p-6">
          <h3 className="section-title">Notes</h3>
          <textarea
            {...register("notes")}
            rows={3}
            className="input resize-none"
            placeholder="Observations, remarques…"
          />
        </div>

        {/* ── Erreur API ── */}
        {mutError && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {mutError?.response?.data?.message ?? "Une erreur est survenue."}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary gap-2"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" /> Enregistrement…
              </>
            ) : isEdit ? (
              "Enregistrer les modifications"
            ) : (
              "Créer le chauffeur"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
