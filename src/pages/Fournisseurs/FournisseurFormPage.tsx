import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fournisseursApi } from "@/api/finance.api";
import PageHeader from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingPage";
import { Building2, Upload, X } from "lucide-react";
import { mediaUrl } from "@/utils";
import toast from "react-hot-toast";

const schema = z.object({
  nom: z.string().min(2, "Nom obligatoire").max(150),
  type: z.string().optional(),
  telephone: z.string().max(30).optional().or(z.literal("")),
  email: z
    .string()
    .email("Email invalide")
    .max(150)
    .optional()
    .or(z.literal("")),
  adresse: z.string().max(255).optional().or(z.literal("")),
  ville: z.string().max(100).optional().or(z.literal("")),
  specialite: z.string().max(150).optional().or(z.literal("")),
  ninea: z.string().max(50).optional().or(z.literal("")),
  est_actif: z.boolean().optional(),
  notes: z.string().max(1000).optional().or(z.literal("")),
});
type FormData = z.infer<typeof schema>;

const TYPES_FOURNISSEUR = [
  { value: "", label: "— Non spécifié —" },
  { value: "garage", label: "Garage" },
  { value: "concessionnaire", label: "Concessionnaire" },
  { value: "pneu", label: "Pneumatiques" },
  { value: "carburant", label: "Carburant" },
  { value: "carrosserie", label: "Carrosserie" },
  { value: "electricite", label: "Électricité" },
];

function F({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

export default function FournisseurFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const qc = useQueryClient();

  const { data: fournisseur, isLoading } = useQuery({
    queryKey: ["fournisseur", id],
    queryFn: () => fournisseursApi.get(parseInt(id!)).then((r) => r.data.data),
    enabled: isEdit,
  });

  // ── Logo (optionnel) ────────────────────────────────────────
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fournisseur?.logo_url && !logoFile) {
      setLogoPreview(mediaUrl(fournisseur.logo_url));
    }
  }, [fournisseur]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Le logo doit être une image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le logo ne doit pas dépasser 2 Mo.");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const deleteLogoMut = useMutation({
    mutationFn: () => fournisseursApi.deleteLogo(parseInt(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fournisseur", id] });
      qc.invalidateQueries({ queryKey: ["fournisseurs"] });
      setLogoPreview(null);
      setLogoFile(null);
      toast.success("Logo supprimé.");
    },
  });

  const handleRemoveLogo = () => {
    if (logoFile) {
      // Logo pas encore uploadé — annule juste la sélection locale
      setLogoFile(null);
      setLogoPreview(
        fournisseur?.logo_url ? mediaUrl(fournisseur.logo_url) : null,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (fournisseur?.logo_url) {
      deleteLogoMut.mutate();
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { est_actif: true },
  });

  useEffect(() => {
    if (fournisseur) {
      reset({
        nom: fournisseur.nom,
        type: fournisseur.type ?? "",
        telephone: fournisseur.telephone ?? "",
        email: fournisseur.email ?? "",
        adresse: fournisseur.adresse ?? "",
        ville: fournisseur.ville ?? "",
        specialite: fournisseur.specialite ?? "",
        ninea: fournisseur.ninea ?? "",
        est_actif: fournisseur.est_actif,
        notes: fournisseur.notes ?? "",
      });
    }
  }, [fournisseur, reset]);

  const createMut = useMutation({
    mutationFn: (data: object) => fournisseursApi.create(data),
    onSuccess: async (res) => {
      const newId = res.data.data.id;
      if (logoFile) {
        try {
          await fournisseursApi.uploadLogo(newId, logoFile);
        } catch {
          /* non bloquant */
        }
      }
      qc.invalidateQueries({ queryKey: ["fournisseurs"] });
      toast.success("Fournisseur créé.");
      navigate("/fournisseurs");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Erreur lors de la création.",
      ),
  });

  const updateMut = useMutation({
    mutationFn: (data: object) => fournisseursApi.update(parseInt(id!), data),
    onSuccess: async () => {
      if (logoFile) {
        try {
          await fournisseursApi.uploadLogo(parseInt(id!), logoFile);
        } catch {
          /* non bloquant */
        }
      }
      qc.invalidateQueries({ queryKey: ["fournisseurs"] });
      qc.invalidateQueries({ queryKey: ["fournisseur", id] });
      toast.success("Fournisseur mis à jour.");
      navigate("/fournisseurs");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Erreur lors de la mise à jour.",
      ),
  });

  const onSubmit = (data: FormData) => {
    const payload = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === "" ? null : v]),
    );
    if (isEdit) updateMut.mutate(payload);
    else createMut.mutate(payload);
  };

  if (isEdit && isLoading) {
    return (
      <div className="card p-6">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEdit ? "Modifier le fournisseur" : "Nouveau fournisseur"}
        backTo="/fournisseurs"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        {/* Logo optionnel */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 size={24} className="text-gray-300" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Logo (optionnel)
            </p>
            <div className="flex items-center gap-2">
              <label className="btn-secondary text-xs gap-1.5 px-3 py-1.5 cursor-pointer">
                <Upload size={12} />{" "}
                {logoPreview ? "Changer" : "Choisir une image"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={deleteLogoMut.isPending}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <X size={12} /> Retirer
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              PNG, JPG, WebP ou SVG — 2 Mo max.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <F label="Nom" required error={errors.nom?.message}>
            <input
              {...register("nom")}
              className="input"
              placeholder="Garage Diallo & Fils"
            />
          </F>
          <F label="Type" error={errors.type?.message}>
            <select {...register("type")} className="input">
              {TYPES_FOURNISSEUR.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </F>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <F label="Téléphone" error={errors.telephone?.message}>
            <input
              {...register("telephone")}
              className="input"
              placeholder="+221 77 123 45 67"
            />
          </F>
          <F label="Email" error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              className="input"
              placeholder="contact@garage.sn"
            />
          </F>
        </div>

        <F label="Adresse" error={errors.adresse?.message}>
          <input
            {...register("adresse")}
            className="input"
            placeholder="Adresse complète"
          />
        </F>

        <div className="grid grid-cols-2 gap-4">
          <F label="Ville" error={errors.ville?.message}>
            <input
              {...register("ville")}
              className="input"
              placeholder="Dakar"
            />
          </F>
          <F label="NINEA" error={errors.ninea?.message}>
            <input
              {...register("ninea")}
              className="input"
              placeholder="Numéro NINEA"
            />
          </F>
        </div>

        <F label="Spécialité" error={errors.specialite?.message}>
          <input
            {...register("specialite")}
            className="input"
            placeholder="ex : Mécanique générale, climatisation…"
          />
        </F>

        <F label="Notes" error={errors.notes?.message}>
          <textarea
            {...register("notes")}
            rows={3}
            className="input resize-none"
            placeholder="Remarques internes…"
          />
        </F>

        {isEdit && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register("est_actif")}
              className="w-4 h-4 accent-primary-600"
            />
            <span className="text-sm text-gray-700">Fournisseur actif</span>
          </label>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/fournisseurs")}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary gap-2"
          >
            {isSubmitting && <LoadingSpinner size="sm" />}
            {isEdit ? "Enregistrer les modifications" : "Créer le fournisseur"}
          </button>
        </div>
      </form>
    </div>
  );
}
