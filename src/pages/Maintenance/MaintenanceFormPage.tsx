import { useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateMaintenance,
  useUpdateMaintenance,
  useMaintenance,
  useAgences,
  useFournisseurs,
} from "@/hooks";
import PageHeader from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingPage";
import { useQuery } from "@tanstack/react-query";
import { vehiculesApi } from "@/api/vehicules.api";
import { axesLivraisonApi } from "@/api/finance.api";

const schema = z.object({
  vehicule_id: z.coerce.number().min(1, "Véhicule obligatoire"),
  agence_id: z.coerce.number().min(1, "Agence obligatoire"),
  axe_livraison_id: z.coerce.number().optional().nullable(),
  type_operation: z.enum([
    "entretien",
    "reparation",
    "pneu",
    "equipement",
    "contravention",
    "carrosserie",
    "visite_technique",
  ]),
  titre: z.string().min(3, "Titre obligatoire (min 3 caractères)"),
  description_travaux: z
    .string()
    .min(5, "Description obligatoire (min 5 caractères)"),
  date_travaux: z.string().min(1, "Date obligatoire"),
  date_entree: z.string().optional().or(z.literal("")),
  kilometrage: z.coerce.number().min(0, "Kilométrage obligatoire"),
  fournisseur_id: z.coerce.number().optional().nullable(),
  chauffeur_id: z.coerce.number().optional().nullable(),
  categorie_travaux: z.string().optional().or(z.literal("")),
  fournitures_mo: z.string().optional().or(z.literal("")),
  montant_ht: z.coerce.number().min(0).optional(),
  tva: z.coerce.number().min(0).max(100).optional(),
  montant_ttc: z.coerce.number().min(0).optional(),
  numero_facture: z.string().optional().or(z.literal("")),
  statut: z.enum(["planifie", "en_cours", "termine", "annule"]).optional(),
  notes: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

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

export default function MaintenanceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const vehiculeIdParam = searchParams.get("vehicule_id");
  const isEdit = !!id;

  const createMut = useCreateMaintenance();
  const updateMut = useUpdateMaintenance();
  const { data: maintenanceExistante, isLoading: loadingMaint } =
    useMaintenance(isEdit ? id! : undefined);
  const { data: agences = [] } = useAgences();
  const { data: fournisseurs = [] } = useFournisseurs();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicule_id: vehiculeIdParam ? parseInt(vehiculeIdParam) : undefined,
      type_operation: "entretien",
      statut: "en_cours",
      date_travaux: new Date().toISOString().slice(0, 10),
      tva: 18,
    },
  });

  const agenceId = watch("agence_id");
  const montantHt = watch("montant_ht");
  const tva = watch("tva");

  // Pré-remplir le formulaire en mode édition
  useEffect(() => {
    if (isEdit && maintenanceExistante) {
      const m = maintenanceExistante;
      setValue("vehicule_id", m.vehicule_id);
      setValue("agence_id", m.agence_id);
      setValue("axe_livraison_id", m.axe_livraison_id ?? undefined);
      setValue("type_operation", m.type_operation);
      setValue("statut", m.statut);
      setValue("date_travaux", m.date_travaux?.slice(0, 10) ?? "");
      setValue("titre", m.titre ?? "");
      setValue("description_travaux", m.description_travaux ?? "");
      setValue("kilometrage", m.kilometrage ?? 0);
      setValue("fournisseur_id", m.fournisseur_id ?? undefined);
      setValue("chauffeur_id", m.chauffeur_id ?? undefined);
      setValue("numero_facture", m.numero_facture ?? "");
      setValue("montant_ht", m.montant_ht ?? undefined);
      setValue("tva", m.tva ?? 18);
      setValue("montant_ttc", m.montant_ttc ?? undefined);
    }
  }, [isEdit, maintenanceExistante, setValue]);

  // Auto-calculer TTC quand HT ou TVA change
  const computedTtc =
    montantHt && tva != null
      ? Math.round(Number(montantHt) * (1 + Number(tva) / 100))
      : undefined;

  // Véhicules filtrés par agence sélectionnée
  const { data: vehiculesData } = useQuery({
    queryKey: ["vehicules-select", agenceId],
    queryFn: () =>
      vehiculesApi
        .list({
          "filter[agence_id]": agenceId || undefined,
          per_page: 200,
        })
        .then((r) => r.data.data),
    enabled: !!agenceId,
    staleTime: 60_000,
  });

  // Axes de livraison filtrés par agence
  const { data: axesData } = useQuery({
    queryKey: ["axes-select", agenceId],
    queryFn: () =>
      axesLivraisonApi
        .list({
          "filter[agence_id]": agenceId,
          "filter[est_actif]": true,
        } as any)
        .then((r) => r.data.data),
    enabled: !!agenceId,
    staleTime: 60_000,
  });

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      montant_ttc: data.montant_ttc ?? computedTtc,
      fournisseur_id: data.fournisseur_id || null,
      chauffeur_id: data.chauffeur_id || null,
      axe_livraison_id: data.axe_livraison_id || null,
      date_entree: data.date_entree || null,
      categorie_travaux: data.categorie_travaux || null,
      fournitures_mo: data.fournitures_mo || null,
      numero_facture: data.numero_facture || null,
      notes: data.notes || null,
    };
    if (isEdit) {
      await updateMut.mutateAsync({ id: id!, data: payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    navigate(
      vehiculeIdParam ? `/vehicules/${vehiculeIdParam}` : "/maintenances",
    );
  };

  if (isEdit && loadingMaint) {
    return (
      <div className="card p-8 text-center text-gray-400">Chargement…</div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={isEdit ? "Modifier la maintenance" : "Nouvelle maintenance"}
        subtitle={
          isEdit
            ? `Modification — ${maintenanceExistante?.titre ?? ""}`
            : "Enregistrer une intervention sur un véhicule"
        }
        backTo={
          vehiculeIdParam ? `/vehicules/${vehiculeIdParam}` : "/maintenances"
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identification */}
        <div className="card p-6">
          <h3 className="section-title">Identification</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Agence" required error={errors.agence_id?.message}>
              <select {...register("agence_id")} className="input">
                <option value="">-- Sélectionner --</option>
                {agences.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.nom}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Véhicule"
              required
              error={errors.vehicule_id?.message}
            >
              <select
                {...register("vehicule_id")}
                className="input"
                disabled={!agenceId}
              >
                <option value="">-- Sélectionner l'agence d'abord --</option>
                {(vehiculesData ?? []).map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.immatriculation} — {v.marque} {v.modele}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Axe de livraison">
              <select
                {...register("axe_livraison_id")}
                className="input"
                disabled={!agenceId}
              >
                <option value="">— Sans axe —</option>
                {(axesData ?? []).map((ax: any) => (
                  <option key={ax.id} value={ax.id}>
                    {ax.nom}
                    {ax.zone ? ` · ${ax.zone}` : ""}
                  </option>
                ))}
              </select>
              {!agenceId && (
                <p className="text-xs text-gray-400 mt-1">
                  Sélectionnez une agence d'abord
                </p>
              )}
            </Field>

            <Field
              label="Type d'opération"
              required
              error={errors.type_operation?.message}
            >
              <select {...register("type_operation")} className="input">
                <option value="entretien">Entretien</option>
                <option value="reparation">Réparation</option>
                <option value="equipement">Équipement</option>
                <option value="contravention">Contravention</option>
                <option value="carrosserie">Carrosserie</option>
                <option value="visite_technique">Visite technique</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Pour un achat, remplacement ou rotation de pneus, utilisez le
                module{" "}
                <a
                  href="/pneumatiques/nouveau"
                  className="text-primary-600 hover:underline"
                >
                  Pneumatiques
                </a>{" "}
                dédié — cela évite un double comptage dans le TCO.
              </p>
            </Field>

            <Field label="Statut" error={errors.statut?.message}>
              <select {...register("statut")} className="input">
                <option value="planifie">Planifié</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
              </select>
            </Field>

            <Field label="Catégorie">
              <input
                {...register("categorie_travaux")}
                className="input"
                placeholder="Vidange, freins…"
              />
            </Field>
          </div>
        </div>

        {/* Description */}
        <div className="card p-6">
          <h3 className="section-title">Description</h3>
          <div className="space-y-4">
            <Field
              label="Titre de l'intervention"
              required
              error={errors.titre?.message}
            >
              <input
                {...register("titre")}
                className="input"
                placeholder="Vidange + filtre huile"
              />
            </Field>
            <Field
              label="Description des travaux"
              required
              error={errors.description_travaux?.message}
            >
              <textarea
                {...register("description_travaux")}
                rows={3}
                className="input"
                placeholder="Détail des opérations effectuées…"
              />
            </Field>
            <Field label="Fournitures & Main d'œuvre">
              <textarea
                {...register("fournitures_mo")}
                rows={2}
                className="input"
                placeholder="5L huile 5W40, filtre à huile…"
              />
            </Field>
          </div>
        </div>

        {/* Dates & km */}
        <div className="card p-6">
          <h3 className="section-title">Dates & Kilométrage</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field
              label="Date des travaux"
              required
              error={errors.date_travaux?.message}
            >
              <input
                {...register("date_travaux")}
                type="date"
                className="input"
              />
            </Field>
            <Field label="Date d'entrée atelier">
              <input
                {...register("date_entree")}
                type="date"
                className="input"
              />
            </Field>
            <Field
              label="Kilométrage"
              required
              error={errors.kilometrage?.message}
            >
              <input
                {...register("kilometrage")}
                type="number"
                className="input"
                min={0}
                placeholder="0"
              />
            </Field>
          </div>
        </div>

        {/* Intervenants */}
        <div className="card p-6">
          <h3 className="section-title">Intervenants</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fournisseur / Garage">
              <select {...register("fournisseur_id")} className="input">
                <option value="">-- Sélectionner --</option>
                {fournisseurs.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="N° facture">
              <input
                {...register("numero_facture")}
                className="input"
                placeholder="FAC-2025-001"
              />
            </Field>
          </div>
        </div>

        {/* Finances */}
        <div className="card p-6">
          <h3 className="section-title">Informations financières</h3>
          <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Montant HT (FCFA)" error={errors.montant_ht?.message}>
              <input
                {...register("montant_ht")}
                type="number"
                className="input"
                min={0}
                step={100}
              />
            </Field>
            <Field label="TVA (%)" error={errors.tva?.message}>
              <input
                {...register("tva")}
                type="number"
                className="input"
                min={0}
                max={100}
                step={0.5}
              />
            </Field>
            <Field
              label="Montant TTC (FCFA)"
              error={errors.montant_ttc?.message}
            >
              <input
                {...register("montant_ttc")}
                type="number"
                className="input"
                min={0}
                step={100}
                placeholder={computedTtc ? String(computedTtc) : "Auto-calculé"}
              />
            </Field>
          </div>
          {computedTtc && (
            <p className="text-xs text-primary-600 mt-2">
              TTC auto-calculé :{" "}
              <strong>{computedTtc.toLocaleString("fr-SN")} FCFA</strong>
              {computedTtc >= 500_000 && (
                <span className="ml-2 text-yellow-600">
                  ⚠ Nécessitera approbation directeur
                </span>
              )}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="card p-6">
          <h3 className="section-title">Notes</h3>
          <textarea
            {...register("notes")}
            rows={2}
            className="input"
            placeholder="Observations, recommandations…"
          />
        </div>

        {/* Erreur globale */}
        {(createMut.isError || updateMut.isError) && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {((createMut.error || updateMut.error) as any)?.response?.data
              ?.message ?? "Une erreur est survenue."}
          </div>
        )}

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
              "Mettre à jour"
            ) : (
              "Enregistrer la maintenance"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
