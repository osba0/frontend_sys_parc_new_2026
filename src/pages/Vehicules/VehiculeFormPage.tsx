import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateVehicule,
  useUpdateVehicule,
  useVehicule,
  useAgences,
} from "@/hooks";
import PageHeader from "@/components/shared/PageHeader";
import { CardLoading, LoadingSpinner } from "@/components/shared/LoadingPage";
import PlaqueSN from "@/components/shared/PlaqueSN";

// ── Schéma Zod ───────────────────────────────────────────────
const schema = z.object({
  agence_id: z.coerce.number().min(1, "Agence obligatoire"),
  immatriculation: z.string().min(2, "Obligatoire").max(20).toUpperCase(),
  style_plaque: z.enum(["nouvelle", "ancienne"]).default("nouvelle"),
  plaque_ville: z.string().max(5).optional().nullable(),
  plaque_code_ville: z.string().max(3).optional().nullable(),
  marque: z.string().min(1, "Obligatoire").max(100),
  modele: z.string().min(1, "Obligatoire").max(100),
  type_vehicule: z.enum(["livraison", "administratif", "scooter"]),
  categorie: z.string().max(50).optional().or(z.literal("")),
  annee_fabrication: z.coerce
    .number()
    .min(1990)
    .max(new Date().getFullYear() + 1)
    .optional(),
  couleur: z.string().max(50).optional().or(z.literal("")),
  numero_chassis: z.string().max(100).optional().or(z.literal("")),
  energie: z
    .enum(["diesel", "essence", "hybride", "electrique"])
    .optional()
    .or(z.literal("")),
  statut: z
    .enum([
      "actif",
      "en_panne",
      "en_maintenance",
      "en_mission",
      "cede",
      "hors_service",
    ])
    .optional(),
  kilometrage_actuel: z.coerce.number().min(0).optional(),
  intervalle_entretien_km: z.coerce.number().min(1000).optional(),
  date_prochaine_visite_tech: z.string().optional().or(z.literal("")),
  date_expiration_assurance: z.string().optional().or(z.literal("")),
  numero_assurance: z.string().max(100).optional().or(z.literal("")),
  compagnie_assurance: z.string().max(100).optional().or(z.literal("")),
  numero_carte_carburant: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
type FormData = z.infer<typeof schema>;

// ── Composant champ ───────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function VehiculeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: vehicule, isLoading: loadingVehicule } = useVehicule(
    isEdit ? parseInt(id!) : undefined,
  );

  // BUG CORRIGÉ : useAgences est RBAC-safe et ne crash pas pour resp_parc
  const { data: agences = [], isLoading: loadingAgences } = useAgences();

  const createMut = useCreateVehicule();
  const updateMut = useUpdateVehicule(parseInt(id ?? "0"));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type_vehicule: "livraison",
      statut: "actif",
      intervalle_entretien_km: 10000,
      kilometrage_actuel: 0,
    },
  });

  useEffect(() => {
    if (vehicule && isEdit) {
      reset({
        agence_id: vehicule.agence_id,
        immatriculation: vehicule.immatriculation,
        style_plaque: vehicule.style_plaque ?? "nouvelle",
        plaque_ville: vehicule.plaque_ville ?? "",
        plaque_code_ville: vehicule.plaque_code_ville ?? "",
        marque: vehicule.marque,
        modele: vehicule.modele,
        type_vehicule: vehicule.type_vehicule,
        categorie: vehicule.categorie ?? "",
        annee_fabrication: vehicule.annee_fabrication ?? undefined,
        couleur: vehicule.couleur ?? "",
        numero_chassis: vehicule.numero_chassis ?? "",
        energie: (vehicule.energie as any) ?? "",
        statut: vehicule.statut,
        kilometrage_actuel: vehicule.kilometrage_actuel,
        intervalle_entretien_km: vehicule.intervalle_entretien_km,
        date_prochaine_visite_tech: vehicule.date_prochaine_visite_tech ?? "",
        date_expiration_assurance: vehicule.date_expiration_assurance ?? "",
        numero_assurance: vehicule.numero_assurance ?? "",
        compagnie_assurance: vehicule.compagnie_assurance ?? "",
        numero_carte_carburant: vehicule.numero_carte_carburant ?? "",
        notes: vehicule.notes ?? "",
      });
    }
  }, [vehicule, isEdit, reset]);

  // Energie saisie — pour l'aperçu dans Documents & Assurance
  const energieWatched = watch("energie");
  const ENERGIE_LABELS: Record<string, string> = {
    diesel: "Diesel",
    essence: "Essence",
    hybride: "Hybride (Essence)",
    electrique: "Électrique",
  };

  const onSubmit = async (data: FormData) => {
    // Dériver type_carburant depuis energie (source unique)
    const energieToCarburant: Record<string, string> = {
      diesel: "diesel",
      essence: "essence",
      hybride: "essence",
      electrique: "electrique",
    };
    const payload = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === "" ? null : v]),
    );
    if (data.energie) {
      payload.type_carburant = energieToCarburant[data.energie] ?? null;
    }
    if (isEdit) {
      await updateMut.mutateAsync(payload as any);
    } else {
      await createMut.mutateAsync(payload as any);
    }
    navigate("/vehicules");
  };

  if (isEdit && loadingVehicule)
    return (
      <div className="card p-6">
        <CardLoading rows={8} />
      </div>
    );

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={
          isEdit
            ? `Modifier ${vehicule?.immatriculation ?? ""}`
            : "Nouveau véhicule"
        }
        backTo={isEdit ? `/vehicules/${id}` : "/vehicules"}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identification */}
        <div className="card p-6">
          <h3 className="section-title">Identification</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Agence *" error={errors.agence_id?.message}>
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
              label="Immatriculation *"
              error={errors.immatriculation?.message}
            >
              <input
                {...register("immatriculation")}
                className="input uppercase"
                placeholder="AA-0125-AS"
              />
            </Field>

            {/* Style de plaque */}
            <Field label="Style de plaque">
              <div className="flex gap-2">
                {(
                  [
                    { val: "nouvelle" as const, label: "Nouvelle" },
                    { val: "ancienne" as const, label: "Ancienne" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.val}
                    className={`flex-1 flex flex-col items-center gap-2 p-2 rounded-xl border-2 cursor-pointer transition-all ${
                      watch("style_plaque") === opt.val
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      value={opt.val}
                      {...register("style_plaque")}
                      className="sr-only"
                    />
                    <PlaqueSN
                      immatriculation="AA·012·BC"
                      style={opt.val}
                      size="xs"
                    />
                    <p className="text-xs font-semibold text-gray-700 text-center">
                      {opt.label}
                    </p>
                  </label>
                ))}
              </div>
            </Field>

            {/* Ville + code département */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ville (code)">
                <input
                  {...register("plaque_ville")}
                  className="input uppercase"
                  placeholder="DK, TH, STL, ZIG…"
                  maxLength={5}
                />
              </Field>
              <Field label="N° département">
                <input
                  {...register("plaque_code_ville")}
                  className="input"
                  placeholder="01, 02…"
                  maxLength={3}
                />
              </Field>
            </div>
            <Field label="Type *" error={errors.type_vehicule?.message}>
              <select {...register("type_vehicule")} className="input">
                <option value="livraison">Livraison</option>
                <option value="administratif">Administratif</option>
                <option value="scooter">Scooter</option>
              </select>
            </Field>
            <Field label="Marque *" error={errors.marque?.message}>
              <input
                {...register("marque")}
                className="input"
                placeholder="Toyota, TATA, Renault…"
              />
            </Field>
            <Field label="Modèle *" error={errors.modele?.message}>
              <input
                {...register("modele")}
                className="input"
                placeholder="Hilux, LNT407…"
              />
            </Field>
            <Field label="Catégorie">
              <input
                {...register("categorie")}
                className="input"
                placeholder="Camionnette, Berline…"
              />
            </Field>
            <Field label="Année de fabrication">
              <input
                {...register("annee_fabrication")}
                type="number"
                className="input"
                placeholder="2020"
                min={1990}
                max={new Date().getFullYear() + 1}
              />
            </Field>
            <Field label="N° châssis">
              <input {...register("numero_chassis")} className="input" />
            </Field>
            <Field label="Couleur">
              <input
                {...register("couleur")}
                className="input"
                placeholder="Blanc, Gris…"
              />
            </Field>
            <Field label="Énergie">
              <select {...register("energie")} className="input">
                <option value="">-- Sélectionner --</option>
                <option value="diesel">Diesel</option>
                <option value="essence">Essence</option>
                <option value="hybride">Hybride</option>
                <option value="electrique">Électrique</option>
              </select>
            </Field>
            {/* FONCTIONNALITÉ AJOUTÉE : champ statut */}
            {isEdit && (
              <Field label="Statut" error={errors.statut?.message}>
                <select {...register("statut")} className="input">
                  <option value="actif">Actif</option>
                  <option value="en_panne">En panne</option>
                  <option value="en_maintenance">En maintenance</option>
                  <option value="en_mission">En mission</option>
                  <option value="cede">Cédé</option>
                  <option value="hors_service">Hors service</option>
                </select>
              </Field>
            )}
          </div>
        </div>

        {/* Kilométrage & Entretien */}
        <div className="card p-6">
          <h3 className="section-title">Kilométrage & Entretien</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Kilométrage actuel (km)">
              <input
                {...register("kilometrage_actuel")}
                type="number"
                className="input"
                placeholder="0"
                min={0}
              />
            </Field>
            <Field label="Intervalle entretien (km)">
              <input
                {...register("intervalle_entretien_km")}
                type="number"
                className="input"
                placeholder="10000"
                min={1000}
              />
            </Field>
          </div>
        </div>

        {/* Documents & Assurance */}
        <div className="card p-6">
          <h3 className="section-title">Documents & Assurance</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Prochaine visite technique">
              <input
                {...register("date_prochaine_visite_tech")}
                type="date"
                className="input"
              />
            </Field>
            <Field label="Expiration assurance">
              <input
                {...register("date_expiration_assurance")}
                type="date"
                className="input"
              />
            </Field>
            <Field label="N° assurance">
              <input {...register("numero_assurance")} className="input" />
            </Field>
            <Field label="Compagnie assurance">
              <input {...register("compagnie_assurance")} className="input" />
            </Field>
            <Field label="N° carte carburant">
              <input
                {...register("numero_carte_carburant")}
                className="input"
              />
            </Field>
            <Field label="Type carburant">
              <div
                className={`input flex items-center gap-2 ${energieWatched ? "bg-gray-50 text-gray-700" : "bg-gray-50 text-gray-400"}`}
              >
                {energieWatched ? (
                  <>
                    <span className="text-sm">⛽</span>{" "}
                    {ENERGIE_LABELS[energieWatched] ?? energieWatched}
                  </>
                ) : (
                  "— défini par le champ Énergie —"
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Synchronisé automatiquement depuis <strong>Énergie</strong>{" "}
                (section Identification)
              </p>
            </Field>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-6">
          <h3 className="section-title">Notes</h3>
          <textarea
            {...register("notes")}
            rows={3}
            className="input"
            placeholder="Remarques, observations…"
          />
        </div>

        {/* Erreurs globales de mutation */}
        {(createMut.isError || updateMut.isError) && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {(createMut.error as any)?.response?.data?.message ??
              (updateMut.error as any)?.response?.data?.message ??
              "Une erreur est survenue."}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
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
              "Créer le véhicule"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
