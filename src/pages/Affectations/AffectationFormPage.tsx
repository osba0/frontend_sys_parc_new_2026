import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { affectationsApi } from "@/api/operations.api";
import { vehiculesApi } from "@/api/vehicules.api";
import { agencesApi, axesLivraisonApi } from "@/api/finance.api";
import { chauffeursApi } from "@/api/operations.api";
import PageHeader from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingPage";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

// ── Schéma Zod ─────────────────────────────────────────────
const schema = z.object({
  vehicule_id: z.coerce.number().min(1, "Véhicule obligatoire"),
  agence_id: z.coerce.number().min(1, "Agence obligatoire"),
  chauffeur_id: z.coerce.number().optional().or(z.literal("")),
  axe_livraison_id: z.coerce.number().optional().or(z.literal("")),
  type_affectation: z.enum(["livraison", "administratif", "mission"]),
  date_debut: z.string().min(1, "Date obligatoire"),
  kilometrage_debut: z.coerce.number().min(0, "Kilométrage obligatoire"),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const F = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

export default function AffectationFormPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type_affectation: "livraison",
      agence_id: user?.agence_id ?? undefined,
      date_debut: new Date().toISOString().slice(0, 10),
      vehicule_id: sp.get("vehicule_id")
        ? parseInt(sp.get("vehicule_id")!)
        : undefined,
      chauffeur_id: sp.get("chauffeur_id")
        ? parseInt(sp.get("chauffeur_id")!)
        : undefined,
    },
  });

  const agenceId = watch("agence_id");

  // Données de sélection
  const { data: agences = [] } = useQuery({
    queryKey: ["agences-select"],
    queryFn: () => agencesApi.list({ per_page: 100 }).then((r) => r.data.data),
    staleTime: Infinity,
  });
  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules-select-affectation", agenceId],
    queryFn: () =>
      vehiculesApi
        .list({
          per_page: 200,
          "filter[statut]": "actif",
          "filter[agence_id]": agenceId || undefined,
        })
        .then((r) => r.data.data),
    enabled: !!agenceId,
    staleTime: 60_000,
  });
  const { data: chauffeurs = [] } = useQuery({
    queryKey: ["chauffeurs-select-affectation", agenceId],
    queryFn: () =>
      chauffeursApi
        .list({
          per_page: 200,
          "filter[statut]": "actif",
          "filter[agence_id]": agenceId || undefined,
        })
        .then((r) => r.data.data),
    enabled: !!agenceId,
    staleTime: 60_000,
  });
  const { data: axes = [] } = useQuery({
    queryKey: ["axes-livraison-select", agenceId],
    queryFn: () =>
      axesLivraisonApi
        .list({
          per_page: 100,
          "filter[agence_id]": agenceId || undefined,
          "filter[est_actif]": true,
        })
        .then((r) => r.data.data),
    enabled: !!agenceId,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: (data: object) => affectationsApi.create(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["affectations"] });
      qc.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Affectation créée.");
      // Rediriger vers le véhicule si on venait de sa fiche
      const vid = sp.get("vehicule_id");
      navigate(vid ? `/vehicules/${vid}` : "/affectations");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Erreur lors de la création.",
      ),
  });

  const onSubmit = (data: FormValues) => {
    // Nettoyer les champs optionnels vides
    const payload: Record<string, unknown> = { ...data };
    if (!data.chauffeur_id) delete payload.chauffeur_id;
    if (!data.axe_livraison_id) delete payload.axe_livraison_id;
    if (!data.notes) delete payload.notes;
    mutation.mutate(payload);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Nouvelle affectation" backTo="/affectations" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Localisation */}
        <div className="card p-6">
          <h3 className="section-title">Localisation</h3>
          <div className="grid grid-cols-2 gap-4">
            <F label="Agence *" error={errors.agence_id?.message}>
              <select {...register("agence_id")} className="input">
                <option value="">-- Sélectionner --</option>
                {agences.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.nom}
                  </option>
                ))}
              </select>
            </F>

            <F label="Véhicule *" error={errors.vehicule_id?.message}>
              <select
                {...register("vehicule_id")}
                className="input"
                disabled={!agenceId}
              >
                <option value="">-- Sélectionner --</option>
                {(vehicules as any[]).map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.immatriculation} — {v.marque} {v.modele}
                  </option>
                ))}
              </select>
            </F>
          </div>
        </div>

        {/* Affectation */}
        <div className="card p-6">
          <h3 className="section-title">Affectation</h3>
          <div className="grid grid-cols-2 gap-4">
            <F label="Chauffeur">
              <select
                {...register("chauffeur_id")}
                className="input"
                disabled={!agenceId}
              >
                <option value="">-- Sans chauffeur --</option>
                {(chauffeurs as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nom_complet}
                  </option>
                ))}
              </select>
            </F>

            <F label="Axe de livraison">
              <select
                {...register("axe_livraison_id")}
                className="input"
                disabled={!agenceId}
              >
                <option value="">-- Sans axe --</option>
                {(axes as any[]).map((ax: any) => (
                  <option key={ax.id} value={ax.id}>
                    {ax.nom}
                  </option>
                ))}
              </select>
            </F>

            <F label="Type *" error={errors.type_affectation?.message}>
              <select {...register("type_affectation")} className="input">
                <option value="livraison">Livraison</option>
                <option value="administratif">Administratif</option>
                <option value="mission">Mission</option>
              </select>
            </F>
          </div>
        </div>

        {/* Dates & Km */}
        <div className="card p-6">
          <h3 className="section-title">Dates & Kilométrage</h3>
          <div className="grid grid-cols-2 gap-4">
            <F label="Date de début *" error={errors.date_debut?.message}>
              <input
                {...register("date_debut")}
                type="date"
                className="input"
              />
            </F>

            <F
              label="Kilométrage de départ *"
              error={errors.kilometrage_debut?.message}
            >
              <input
                {...register("kilometrage_debut")}
                type="number"
                className="input"
                min={0}
              />
            </F>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-6">
          <h3 className="section-title">Notes</h3>
          <textarea
            {...register("notes")}
            rows={3}
            className="input resize-none"
            placeholder="Observations, instructions particulières…"
          />
        </div>

        <div className="flex gap-3 justify-end">
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
                <LoadingSpinner size="sm" /> Création…
              </>
            ) : (
              "Créer l'affectation"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
