import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { signalementsApi } from "@/api/operations.api";
import { vehiculesApi } from "@/api/vehicules.api";
import { chauffeursApi } from "@/api/operations.api";
import { authApi } from "@/api/auth.api";
import PageHeader from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingPage";
import { useAgences } from "@/hooks";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

// ── Schéma Zod ────────────────────────────────────────────────
const schema = z.object({
  agence_id: z.coerce.number().min(1, "Agence obligatoire"),
  vehicule_id: z.coerce.number().min(1, "Véhicule obligatoire"),
  chauffeur_id: z.coerce.number().optional().nullable(),
  origine: z.enum([
    "responsable",
    "visite_technique",
    "checklist",
    "chauffeur",
  ]),
  type_defaut: z.string().min(1),
  gravite: z.enum(["faible", "moyenne", "haute", "critique"]),
  titre: z.string().min(3, "Titre obligatoire (min 3 car.)"),
  description: z.string().min(10, "Description obligatoire (min 10 car.)"),
  date_signalement: z.string().min(1, "Date obligatoire"),
  kilometrage: z.coerce.number().optional().nullable(),
});
type FormValues = z.infer<typeof schema>;

const TYPES_DEFAUT = [
  ["panne_moteur", "Panne moteur"],
  ["probleme_freins", "Freins"],
  ["probleme_pneu", "Pneumatique"],
  ["probleme_electrique", "Électrique"],
  ["probleme_carrosserie", "Carrosserie"],
  ["probleme_eclairage", "Éclairage"],
  ["fuite", "Fuite"],
  ["surchauffe", "Surchauffe"],
  ["bruit_anormal", "Bruit anormal"],
  ["probleme_document", "Document"],
  ["autre", "Autre"],
];

const F = ({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="label">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

export default function SignalementFormPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const qc = useQueryClient();
  const { user, hasRole } = useAuthStore();

  const estChauffeur = hasRole("chauffeur");
  const c = user?.chauffeur;

  // Utiliser /auth/me — toujours accessible (pas de restriction permission)
  const { data: meData } = useQuery({
    queryKey: ["me-vehicules-actifs"],
    queryFn: () => authApi.me().then((r) => r.data.data),
    enabled: estChauffeur && !!c?.id,
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

  // resp_agence et resp_parc sont scopés à leur agence
  const agenceScopee = hasRole("resp_agence", "resp_parc")
    ? (user?.agence_id ?? null)
    : null;

  // Le chauffeur n'a pas agence.viewAny — désactiver pour éviter le 403
  const { data: agences = [] } = useAgences({ enabled: !estChauffeur });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      origine: estChauffeur ? "chauffeur" : "responsable",
      gravite: "moyenne",
      type_defaut: "panne_moteur",
      date_signalement: new Date().toISOString().slice(0, 10),
      // Chauffeur : pré-remplir son 1er véhicule affecté
      vehicule_id:
        estChauffeur && vehiculesActifs[0]
          ? vehiculesActifs[0].vehicule_id
          : sp.get("vehicule_id")
            ? parseInt(sp.get("vehicule_id")!)
            : undefined,
      chauffeur_id:
        estChauffeur && c?.id
          ? c.id
          : sp.get("chauffeur_id")
            ? parseInt(sp.get("chauffeur_id")!)
            : null,
      agence_id:
        agenceScopee ??
        (estChauffeur ? user?.agence_id : undefined) ??
        undefined,
    },
  });

  const agenceId = watch("agence_id");

  // Forcer l'agence pour resp_agence/resp_parc et chauffeur
  useEffect(() => {
    if (agenceScopee) setValue("agence_id", agenceScopee);
    else if (estChauffeur && user?.agence_id)
      setValue("agence_id", user.agence_id);
  }, [agenceScopee, estChauffeur, user?.agence_id, setValue]);

  // Synchroniser vehicule_id quand vehiculesActifs se charge (fetchMe asynchrone)
  // defaultValues ne se recalcule qu'au montage — si les données arrivent après,
  // il faut pousser la valeur via setValue
  useEffect(() => {
    if (estChauffeur && vehiculesActifs.length > 0) {
      const current = watch("vehicule_id");
      if (!current) {
        setValue("vehicule_id", vehiculesActifs[0].vehicule_id);
      }
    }
  }, [estChauffeur, vehiculesActifs.length]); // eslint-disable-line

  // Véhicules filtrés par agence — désactivé pour le chauffeur (vehiculesActifs suffit)
  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules-sig-form", agenceId],
    queryFn: () =>
      vehiculesApi
        .list({
          per_page: 200,
          "filter[agence_id]": agenceId || undefined,
          "filter[statut]": "actif",
        })
        .then((r) => r.data.data as any[]),
    enabled: !!agenceId && !estChauffeur,
    staleTime: 60_000,
  });

  // Chauffeurs filtrés par agence — désactivé pour le chauffeur
  const { data: chauffeurs = [] } = useQuery({
    queryKey: ["chauffeurs-sig-form", agenceId],
    queryFn: () =>
      chauffeursApi
        .list({
          per_page: 200,
          "filter[agence_id]": agenceId || undefined,
          "filter[statut]": "actif",
        })
        .then((r) => r.data.data as any[]),
    enabled: !!agenceId && !estChauffeur,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      const payload: Record<string, unknown> = { ...data };
      if (!data.chauffeur_id) delete payload.chauffeur_id;
      if (!data.kilometrage) delete payload.kilometrage;
      return signalementsApi.create(payload);
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["signalements"] });
      toast.success("Signalement créé.");
      navigate(`/signalements/${res.data.data.id}`);
    },
    onError: (err: any) => {
      const msgs = err?.response?.data?.errors;
      if (msgs)
        Object.values(msgs as Record<string, string[]>).forEach((m) =>
          toast.error(m[0]),
        );
      else
        toast.error(
          err?.response?.data?.message ?? "Erreur lors de la création.",
        );
    },
  });

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Nouveau signalement" backTo="/signalements" />

      <form
        onSubmit={handleSubmit((d) => mutation.mutate(d as FormValues))}
        className="space-y-6"
      >
        {/* ── Localisation ── */}
        <div className="card p-6">
          <h3 className="section-title">Localisation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {estChauffeur ? (
              // Chauffeur : agence et chauffeur masqués, véhicule sélectionnable si multi
              <>
                <input type="hidden" {...register("agence_id")} />
                <input type="hidden" {...register("chauffeur_id")} />
                <div className="sm:col-span-2">
                  {vehiculesActifs.length > 1 ? (
                    <F
                      label="Véhicule concerné"
                      required
                      error={errors.vehicule_id?.message}
                    >
                      <select {...register("vehicule_id")} className="input">
                        <option value="">-- Sélectionner --</option>
                        {vehiculesActifs.map((v) => (
                          <option key={v.vehicule_id} value={v.vehicule_id}>
                            {v.immatriculation} — {v.marque_modele}
                          </option>
                        ))}
                      </select>
                    </F>
                  ) : vehiculesActifs.length === 1 ? (
                    <>
                      <input type="hidden" {...register("vehicule_id")} />
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-sm font-medium text-gray-700">
                          Véhicule :
                        </span>
                        <span className="text-sm font-mono text-primary-700">
                          {vehiculesActifs[0].immatriculation}
                        </span>
                        <span className="text-sm text-gray-500">
                          — {vehiculesActifs[0].marque_modele}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                      ⚠ Aucun véhicule affecté. Contactez votre responsable de
                      parc.
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Gestionnaire : tous les champs
              <>
                {/* Agence — verrouillée pour resp_agence/resp_parc */}
                <F label="Agence" required error={errors.agence_id?.message}>
                  <select
                    {...register("agence_id")}
                    className="input"
                    disabled={!!agenceScopee}
                  >
                    <option value="">-- Sélectionner --</option>
                    {agences.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                      </option>
                    ))}
                  </select>
                  {agenceScopee && (
                    <p className="text-xs text-gray-400 mt-1">
                      Scopée à votre agence.
                    </p>
                  )}
                </F>

                {/* Véhicule — filtré par agence */}
                <F
                  label="Véhicule"
                  required
                  error={errors.vehicule_id?.message}
                >
                  <select
                    {...register("vehicule_id")}
                    className="input"
                    disabled={!agenceId}
                  >
                    <option value="">
                      -- Sélectionner l'agence d'abord --
                    </option>
                    {(vehicules as any[]).map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.immatriculation} — {v.marque} {v.modele}
                      </option>
                    ))}
                  </select>
                </F>

                {/* Chauffeur — optionnel, filtré par agence */}
                <F label="Chauffeur concerné">
                  <select
                    {...register("chauffeur_id")}
                    className="input"
                    disabled={!agenceId}
                  >
                    <option value="">— Sans chauffeur —</option>
                    {(chauffeurs as any[]).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.nom_complet}
                      </option>
                    ))}
                  </select>
                </F>
              </>
            )}

            {/* Origine */}
            <F
              label="Origine du signalement"
              required
              error={errors.origine?.message}
            >
              <select {...register("origine")} className="input">
                <option value="responsable">
                  Responsable (constat direct)
                </option>
                <option value="visite_technique">Visite technique</option>
                <option value="checklist">Checklist</option>
                <option value="chauffeur">Signalé par chauffeur</option>
              </select>
            </F>
          </div>
        </div>

        {/* ── Défaut ── */}
        <div className="card p-6">
          <h3 className="section-title">Défaut constaté</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Type de défaut" required>
              <select {...register("type_defaut")} className="input">
                {TYPES_DEFAUT.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </F>

            <F label="Gravité" required error={errors.gravite?.message}>
              <select {...register("gravite")} className="input">
                <option value="faible">Faible</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
                <option value="critique">🔴 Critique</option>
              </select>
            </F>

            <F
              label="Date du signalement"
              required
              error={errors.date_signalement?.message}
            >
              <input
                {...register("date_signalement")}
                type="date"
                className="input"
                max={new Date().toISOString().slice(0, 10)}
              />
            </F>

            <F label="Kilométrage au constat">
              <input
                {...register("kilometrage")}
                type="number"
                className="input"
                min={0}
                placeholder="km au compteur"
              />
            </F>
          </div>
        </div>

        {/* ── Description ── */}
        <div className="card p-6">
          <h3 className="section-title">Description</h3>
          <div className="space-y-4">
            <F label="Titre" required error={errors.titre?.message}>
              <input
                {...register("titre")}
                className="input"
                placeholder="Ex : Fuite d'huile moteur constatée lors du contrôle"
              />
            </F>

            <F
              label="Description détaillée"
              required
              error={errors.description?.message}
            >
              <textarea
                {...register("description")}
                rows={4}
                className="input resize-none"
                placeholder="Décrivez précisément le défaut : circonstances, symptômes, risques…"
              />
            </F>
          </div>
        </div>

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
            disabled={isSubmitting || mutation.isPending}
            className="btn-danger gap-2"
          >
            {isSubmitting || mutation.isPending ? (
              <>
                <LoadingSpinner size="sm" /> Création…
              </>
            ) : (
              "⚠ Créer le signalement"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
