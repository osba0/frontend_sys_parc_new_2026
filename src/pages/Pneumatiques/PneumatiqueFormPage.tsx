import { useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pneumatiquesApi } from "@/api/pneumatiques.api";
import { vehiculesApi } from "@/api/vehicules.api";
import { chauffeursApi } from "@/api/operations.api";
import { agencesApi, fournisseursApi } from "@/api/finance.api";
import PageHeader from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingPage";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

// ── Schéma ────────────────────────────────────────────────────
const schema = z.object({
  agence_id: z.coerce
    .number({ invalid_type_error: "Agence obligatoire" })
    .min(1, "Agence obligatoire"),
  vehicule_id: z.coerce
    .number({ invalid_type_error: "Véhicule obligatoire" })
    .min(1, "Véhicule obligatoire"),
  chauffeur_id: z.union([z.coerce.number(), z.literal("")]).optional(),
  fournisseur_id: z.union([z.coerce.number(), z.literal("")]).optional(),
  date: z.string().min(1, "Date obligatoire"),
  type_operation: z.enum([
    "achat_neuf",
    "rechape",
    "rotation",
    "reforme",
    "reparation",
  ]),
  position: z.string().optional(),
  marque_pneu: z.string().optional(),
  dimension: z.string().optional(),
  quantite: z.coerce.number().min(1, "Quantité ≥ 1").max(20),
  prix_unitaire: z.union([z.coerce.number(), z.literal("")]).optional(),
  montant_total: z.coerce.number().min(0, "Montant obligatoire"),
  kilometrage: z.union([z.coerce.number(), z.literal("")]).optional(),
  commentaire: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

const POSITIONS = [
  { value: "", label: "— Non spécifiée —" },
  { value: "avant_gauche", label: "Avant gauche" },
  { value: "avant_droit", label: "Avant droit" },
  { value: "arriere_gauche", label: "Arrière gauche" },
  { value: "arriere_droit", label: "Arrière droit" },
  { value: "secours", label: "Roue de secours" },
  { value: "train_complet", label: "Train complet (4 roues)" },
];

const TYPES_OPERATION = [
  { value: "achat_neuf", label: "Achat neuf" },
  { value: "rechape", label: "Rechapé" },
  { value: "rotation", label: "Rotation" },
  { value: "reparation", label: "Réparation" },
  { value: "reforme", label: "Réforme" },
];

// ── Champ helper ──────────────────────────────────────────────
function F({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

export default function PneumatiqueFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const isEdit = !!id;
  const qc = useQueryClient();
  const { user, hasRole } = useAuthStore();
  const agenceScopee = !hasRole("super_admin", "directeur")
    ? user?.agence_id
    : undefined;

  const { data: pneu, isLoading: loadingPneu } = useQuery({
    queryKey: ["pneumatique", id],
    queryFn: () => pneumatiquesApi.get(parseInt(id!)).then((r) => r.data.data),
    enabled: isEdit,
  });

  // Pré-sélection véhicule depuis l'URL (?vehicule_id=...) — ex: lien depuis la fiche véhicule
  const vehiculeIdParam = sp.get("vehicule_id");
  const { data: vehiculePrefill } = useQuery({
    queryKey: ["vehicule-prefill", vehiculeIdParam],
    queryFn: () =>
      vehiculesApi.get(parseInt(vehiculeIdParam!)).then((r) => r.data.data),
    enabled: !!vehiculeIdParam && !isEdit,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      agence_id: agenceScopee as any,
      type_operation: "achat_neuf",
      quantite: 1,
      montant_total: 0,
    },
  });

  // Pré-remplissage en mode édition
  useEffect(() => {
    if (pneu) {
      reset({
        agence_id: pneu.agence_id,
        vehicule_id: pneu.vehicule_id,
        chauffeur_id: pneu.chauffeur_id ?? "",
        fournisseur_id: pneu.fournisseur_id ?? "",
        date: pneu.date.slice(0, 10),
        type_operation: pneu.type_operation,
        position: pneu.position ?? "",
        marque_pneu: pneu.marque_pneu ?? "",
        dimension: pneu.dimension ?? "",
        quantite: pneu.quantite,
        prix_unitaire: pneu.prix_unitaire ?? "",
        montant_total: pneu.montant_total,
        kilometrage: pneu.kilometrage ?? "",
        commentaire: pneu.commentaire ?? "",
      });
    }
  }, [pneu, reset]);

  // Pré-remplissage agence + véhicule depuis l'URL (?vehicule_id=...)
  useEffect(() => {
    if (vehiculePrefill && !isEdit) {
      setValue("agence_id", vehiculePrefill.agence_id);
      setValue("vehicule_id", vehiculePrefill.id);
    }
  }, [vehiculePrefill, isEdit, setValue]);

  const agenceId = watch("agence_id");
  const quantite = watch("quantite");
  const prixUnitaire = watch("prix_unitaire");
  const montantTotal = watch("montant_total");

  // ── Calcul automatique : quantité × prix/u = montant ─────────
  const calculatingRef = useRef(false);

  useEffect(() => {
    if (calculatingRef.current) return;
    const q = Number(quantite);
    const p = Number(prixUnitaire);
    if (q > 0 && p > 0) {
      calculatingRef.current = true;
      setValue("montant_total", Math.round(q * p));
      setTimeout(() => {
        calculatingRef.current = false;
      }, 0);
    }
  }, [quantite, prixUnitaire]); // eslint-disable-line

  useEffect(() => {
    if (calculatingRef.current) return;
    const q = Number(quantite);
    const m = Number(montantTotal);
    if (q > 0 && m > 0) {
      calculatingRef.current = true;
      setValue("prix_unitaire", Math.round((m / q) * 100) / 100);
      setTimeout(() => {
        calculatingRef.current = false;
      }, 0);
    }
  }, [montantTotal]); // eslint-disable-line

  // ── Données selects ───────────────────────────────────────────
  const { data: agences = [] } = useQuery({
    queryKey: ["agences-select"],
    queryFn: () => agencesApi.list({ per_page: 100 }).then((r) => r.data.data),
    staleTime: Infinity,
  });

  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules-pneu-select", agenceId],
    queryFn: () =>
      vehiculesApi
        .list({
          per_page: 200,
          "filter[agence_id]": agenceId || undefined,
        })
        .then((r) => r.data.data),
    enabled: !!agenceId,
    staleTime: 60_000,
  });

  const { data: chauffeurs = [] } = useQuery({
    queryKey: ["chauffeurs-pneu-select", agenceId],
    queryFn: () =>
      chauffeursApi
        .list({
          per_page: 200,
          "filter[agence_id]": agenceId || undefined,
        })
        .then((r: any) => r.data.data),
    enabled: !!agenceId,
    staleTime: 60_000,
  });

  const { data: fournisseurs = [] } = useQuery({
    queryKey: ["fournisseurs-select"],
    queryFn: () =>
      fournisseursApi.list({ per_page: 100 }).then((r: any) => r.data.data),
    staleTime: 60_000,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (data: object) => pneumatiquesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pneumatiques"] });
      toast.success("Opération pneumatique enregistrée.");
      navigate("/pneumatiques");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Erreur lors de l'enregistrement.",
      ),
  });

  const updateMut = useMutation({
    mutationFn: (data: object) => pneumatiquesApi.update(parseInt(id!), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pneumatiques"] });
      qc.invalidateQueries({ queryKey: ["pneumatique", id] });
      toast.success("Opération mise à jour.");
      navigate("/pneumatiques");
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

  if (isEdit && loadingPneu) {
    return (
      <div className="card p-6">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={
          isEdit
            ? "Modifier opération pneumatique"
            : "Nouvelle opération pneumatique"
        }
        backTo="/pneumatiques"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        {/* Agence + Véhicule */}
        <div className="grid grid-cols-2 gap-4">
          <F label="Agence" required error={errors.agence_id?.message}>
            <select
              {...register("agence_id")}
              className="input"
              disabled={!!agenceScopee}
            >
              <option value="">— Sélectionner —</option>
              {agences.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
          </F>
          <F
            label="Véhicule"
            required
            error={errors.vehicule_id?.message}
            hint={!agenceId ? "Sélectionnez une agence" : undefined}
          >
            <select
              {...register("vehicule_id")}
              className="input"
              disabled={!agenceId}
            >
              <option value="">— Sélectionner —</option>
              {vehicules.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.immatriculation} — {v.marque} {v.modele}
                </option>
              ))}
            </select>
          </F>
        </div>

        {/* Date + Type opération */}
        <div className="grid grid-cols-2 gap-4">
          <F label="Date" required error={errors.date?.message}>
            <input
              {...register("date")}
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              className="input"
            />
          </F>
          <F
            label="Type d'opération"
            required
            error={errors.type_operation?.message}
          >
            <select {...register("type_operation")} className="input">
              {TYPES_OPERATION.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </F>
        </div>

        {/* Position + Chauffeur */}
        <div className="grid grid-cols-2 gap-4">
          <F label="Position sur le véhicule" error={errors.position?.message}>
            <select {...register("position")} className="input">
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </F>
          <F
            label="Chauffeur"
            hint="Optionnel"
            error={errors.chauffeur_id?.message}
          >
            <select
              {...register("chauffeur_id")}
              className="input"
              disabled={!agenceId}
            >
              <option value="">— Non spécifié —</option>
              {chauffeurs.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.nom_complet}
                </option>
              ))}
            </select>
          </F>
        </div>

        {/* Marque + Dimension */}
        <div className="grid grid-cols-2 gap-4">
          <F
            label="Marque du pneu"
            hint="ex : Michelin, Continental…"
            error={errors.marque_pneu?.message}
          >
            <input
              {...register("marque_pneu")}
              className="input"
              placeholder="Michelin"
            />
          </F>
          <F
            label="Dimension"
            hint="ex : 215/65 R16"
            error={errors.dimension?.message}
          >
            <input
              {...register("dimension")}
              className="input"
              placeholder="215/65 R16"
            />
          </F>
        </div>

        {/* Quantité + Prix unitaire + Montant */}
        <div className="grid grid-cols-3 gap-4">
          <F label="Quantité" required error={errors.quantite?.message}>
            <input
              {...register("quantite")}
              type="number"
              min={1}
              max={20}
              step={1}
              className="input"
            />
          </F>
          <F
            label="Prix unitaire (FCFA)"
            hint="Calculé auto si montant saisi"
            error={errors.prix_unitaire?.message}
          >
            <input
              {...register("prix_unitaire")}
              type="number"
              min={0}
              step={1}
              className="input"
            />
          </F>
          <F
            label="Montant total (FCFA)"
            required
            hint="qté × prix/u"
            error={errors.montant_total?.message}
          >
            <input
              {...register("montant_total")}
              type="number"
              min={0}
              step={1}
              className="input"
            />
          </F>
        </div>
        {quantite > 0 && prixUnitaire && Number(prixUnitaire) > 0 && (
          <p className="text-xs text-primary-600 -mt-2">
            {quantite} × {Number(prixUnitaire).toLocaleString("fr-FR")} FCFA ={" "}
            <strong>
              {Math.round(quantite * Number(prixUnitaire)).toLocaleString(
                "fr-FR",
              )}{" "}
              FCFA
            </strong>
          </p>
        )}

        {/* Fournisseur + Kilométrage */}
        <div className="grid grid-cols-2 gap-4">
          <F
            label="Fournisseur"
            hint="Optionnel"
            error={errors.fournisseur_id?.message}
          >
            <select {...register("fournisseur_id")} className="input">
              <option value="">— Non spécifié —</option>
              {fournisseurs.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </F>
          <F
            label="Kilométrage"
            hint="Au moment de l'opération"
            error={errors.kilometrage?.message}
          >
            <input
              {...register("kilometrage")}
              type="number"
              min={0}
              className="input"
              placeholder="Ex : 85 000"
            />
          </F>
        </div>

        {/* Commentaire */}
        <F
          label="Commentaire"
          hint="Optionnel — 500 caractères max"
          error={errors.commentaire?.message}
        >
          <textarea
            {...register("commentaire")}
            rows={3}
            className="input resize-none"
            placeholder="Remarques…"
          />
        </F>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/pneumatiques")}
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
            {isEdit ? "Enregistrer les modifications" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
