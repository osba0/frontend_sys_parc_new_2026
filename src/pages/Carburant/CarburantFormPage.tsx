import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { carburantApi } from "@/api/finance.api";
import { vehiculesApi } from "@/api/vehicules.api";
import { chauffeursApi } from "@/api/operations.api";
import { agencesApi, axesLivraisonApi } from "@/api/finance.api";
import PageHeader from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingPage";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth.api";
import { formatCfa } from "@/utils";
import toast from "react-hot-toast";
import {
  PRIX_CARBURANT_DEFAUT,
  getPrixDefaut,
  calculerMontant,
  calculerPrixUnitaire,
} from "@/config/carburantConfig";

// ── Schéma Zod ────────────────────────────────────────────────
const schema = z.object({
  vehicule_id: z.coerce.number().min(1, "Véhicule obligatoire"),
  agence_id: z.coerce.number().min(1, "Agence obligatoire"),
  chauffeur_id: z.coerce.number().optional().nullable(),
  axe_livraison_id: z.coerce.number().optional().nullable(),
  date: z.string().min(1, "Date obligatoire"),
  litres: z.coerce
    .number()
    .min(0.1, "Litres obligatoires (min 0.1)")
    .max(500, "Max 500 L"),
  montant: z.coerce.number().min(0, "Montant obligatoire"),
  prix_unitaire: z.coerce.number().optional().nullable(),
  type_carburant: z.string().optional(),
  kilometrage: z.coerce.number().int().min(0).optional().nullable(),
  numero_transaction: z.string().max(100).optional().or(z.literal("")),
  station: z.string().max(100).optional().or(z.literal("")),
  est_complet: z.boolean().default(true),
  notes: z.string().max(500).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

// ── Composant Field ───────────────────────────────────────────
const F = ({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="label">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function CarburantFormPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const qc = useQueryClient();
  const { user, hasRole, setUser } = useAuthStore();

  const estChauffeur = hasRole("chauffeur");
  const c = user?.chauffeur;

  // Utiliser /auth/me — toujours accessible par le chauffeur (pas de restriction permission)
  const { data: meData } = useQuery({
    queryKey: ["me-vehicules-actifs"],
    queryFn: () =>
      authApi.me().then((r) => {
        setUser(r.data.data);
        return r.data.data;
      }),
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

  const chauffeurFiche = c;

  // Seul resp_agence est scopé à son agence — resp_parc voit toutes les agences
  const agenceScopee = hasRole("resp_agence")
    ? (user?.agence_id ?? null)
    : null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      agence_id: agenceScopee ?? user?.agence_id ?? undefined,
      // Chauffeur : pré-remplir avec son 1er véhicule affecté
      vehicule_id:
        estChauffeur && vehiculesActifs[0]
          ? vehiculesActifs[0].vehicule_id
          : sp.get("vehicule_id")
            ? parseInt(sp.get("vehicule_id")!)
            : undefined,
      chauffeur_id:
        estChauffeur && chauffeurFiche?.id ? chauffeurFiche.id : undefined,
      est_complet: true,
      type_carburant: "Diesel",
      prix_unitaire: getPrixDefaut("Diesel") ?? undefined,
    },
  });

  // Forcer l'agence scopée si applicable
  useEffect(() => {
    if (agenceScopee) setValue("agence_id", agenceScopee);
  }, [agenceScopee, setValue]);

  // Synchroniser vehicule_id quand vehiculesActifs arrive après le montage
  useEffect(() => {
    if (estChauffeur && vehiculesActifs.length > 0) {
      const current = watch("vehicule_id");
      if (!current) {
        setValue("vehicule_id", vehiculesActifs[0].vehicule_id);
      }
    }
  }, [estChauffeur, vehiculesActifs.length]); // eslint-disable-line

  const agenceId = watch("agence_id");
  const vehiculeId = watch("vehicule_id");
  const litres = watch("litres");
  const montant = watch("montant");
  const prixUnitaire = watch("prix_unitaire");
  const typeCarburant = watch("type_carburant");

  // Pré-remplir le kilométrage dès que le véhicule est connu/changé
  useEffect(() => {
    if (!vehiculeId) return;

    // Toujours charger via l'API — le chauffeur a vehicule.view sur son véhicule,
    // les gestionnaires ont vehicule.viewAny. C'est l'approche la plus simple
    // et évite les problèmes de dépendances avec la liste vehicules.
    vehiculesApi
      .get(Number(vehiculeId))
      .then((r) => {
        const km = r.data.data?.kilometrage_actuel;
        if (km != null && km > 0) {
          setValue("kilometrage", km, { shouldDirty: false });
        }
      })
      .catch(() => {});
  }, [vehiculeId]); // eslint-disable-line

  const calculatingRef = useRef(false);

  // ── 1. Changement de type → prix défaut → recalcule montant ──
  useEffect(() => {
    if (!typeCarburant) return;
    const p = getPrixDefaut(typeCarburant);
    if (p === null) return;
    calculatingRef.current = true;
    setValue("prix_unitaire", p, { shouldDirty: false });
    const l = parseFloat(String(litres));
    if (l > 0) setValue("montant", calculerMontant(l, p));
    setTimeout(() => {
      calculatingRef.current = false;
    }, 0);
  }, [typeCarburant]); // eslint-disable-line

  // ── 2. Prix/L change → recalcule montant (litres conservés) ──
  useEffect(() => {
    if (calculatingRef.current) return;
    const l = parseFloat(String(litres));
    const p = parseFloat(String(prixUnitaire));
    if (l > 0 && p > 0) {
      calculatingRef.current = true;
      setValue("montant", calculerMontant(l, p));
      setTimeout(() => {
        calculatingRef.current = false;
      }, 0);
    }
  }, [prixUnitaire]); // eslint-disable-line

  // ── 3. Litres saisis → recalcule montant ─────────────────────
  useEffect(() => {
    if (calculatingRef.current) return;
    const l = parseFloat(String(litres));
    const p = parseFloat(String(prixUnitaire));
    if (l > 0 && p > 0) {
      calculatingRef.current = true;
      setValue("montant", calculerMontant(l, p));
      setTimeout(() => {
        calculatingRef.current = false;
      }, 0);
    }
  }, [litres]); // eslint-disable-line

  // ── 4. Montant saisi → recalcule litres ──────────────────────
  useEffect(() => {
    if (calculatingRef.current) return;
    const m = parseFloat(String(montant));
    const p = parseFloat(String(prixUnitaire));
    if (m > 0 && p > 0) {
      calculatingRef.current = true;
      const l = Math.round((m / p) * 10) / 10; // arrondi 1 décimale
      setValue("litres", l);
      setTimeout(() => {
        calculatingRef.current = false;
      }, 0);
    }
  }, [montant]); // eslint-disable-line

  // Données selects — désactivées pour le chauffeur (pas les permissions viewAny)
  const { data: agences = [] } = useQuery({
    queryKey: ["agences-select"],
    queryFn: () => agencesApi.list({ per_page: 100 }).then((r) => r.data.data),
    staleTime: Infinity,
    enabled: !estChauffeur,
  });
  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules-carburant-select", agenceId],
    queryFn: () =>
      vehiculesApi
        .list({
          per_page: 200,
          "filter[agence_id]": agenceId || undefined,
          "filter[statut]": "actif",
        })
        .then((r) => r.data.data),
    enabled: !!agenceId && !estChauffeur,
    staleTime: 60_000,
  });
  const { data: chauffeurs = [] } = useQuery({
    queryKey: ["chauffeurs-carburant-select", agenceId],
    queryFn: () =>
      chauffeursApi
        .list({
          per_page: 200,
          "filter[agence_id]": agenceId || undefined,
          "filter[statut]": "actif",
        })
        .then((r) => r.data.data),
    enabled: !!agenceId && !estChauffeur,
    staleTime: 60_000,
  });
  const { data: axes = [] } = useQuery({
    queryKey: ["axes-livraison-select"],
    queryFn: () =>
      axesLivraisonApi.list({ per_page: 100 }).then((r) => r.data.data),
    staleTime: Infinity,
    enabled: !estChauffeur,
  });

  const mutation = useMutation({
    mutationFn: (data: object) => carburantApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carburant-global"] });
      qc.invalidateQueries({ queryKey: ["dotations"] });
      toast.success("Plein enregistré.");
      // Retour à la liste ou à la fiche véhicule si on en vient
      const vid = sp.get("vehicule_id");
      navigate(vid ? `/vehicules/${vid}` : "/carburant");
    },
    onError: (err: any) => {
      const msgs = err?.response?.data?.errors;
      if (msgs) {
        Object.values(msgs as Record<string, string[]>).forEach((m) =>
          toast.error(m[0]),
        );
      } else {
        toast.error(
          err?.response?.data?.message ?? "Erreur lors de l'enregistrement.",
        );
      }
    },
  });

  const onSubmit = (data: FormValues) => {
    const payload: Record<string, unknown> = { ...data };
    // Nettoyer les nullables vides
    if (!data.chauffeur_id) delete payload.chauffeur_id;
    if (!data.axe_livraison_id) delete payload.axe_livraison_id;
    if (!data.kilometrage) delete payload.kilometrage;
    if (!data.numero_transaction) delete payload.numero_transaction;
    if (!data.station) delete payload.station;
    if (!data.notes) delete payload.notes;
    mutation.mutate(payload);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Nouveau plein carburant"
        backTo={
          sp.get("vehicule_id")
            ? `/vehicules/${sp.get("vehicule_id")}`
            : "/carburant"
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Section Localisation ── */}
        {/* Pour le chauffeur : agence et champ chauffeur sont pré-remplis
            automatiquement et masqués — seul le véhicule est sélectionnable
            s'il en a plusieurs d'affectés. */}
        {estChauffeur ? (
          // Chauffeur : champs cachés + sélecteur véhicule si multi-affectation
          <>
            <input type="hidden" {...register("agence_id")} />
            <input type="hidden" {...register("chauffeur_id")} />
            {vehiculesActifs.length > 1 ? (
              <div className="card p-6">
                <h3 className="section-title">Véhicule concerné</h3>
                <F
                  label="Sélectionner le véhicule"
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
              </div>
            ) : (
              // Un seul véhicule : caché (déjà pré-rempli)
              <input type="hidden" {...register("vehicule_id")} />
            )}
          </>
        ) : (
          <div className="card p-6">
            <h3 className="section-title">Localisation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <F label="Véhicule" required error={errors.vehicule_id?.message}>
                <select
                  {...register("vehicule_id")}
                  className="input"
                  disabled={!agenceId || Number(agenceId) === 0}
                >
                  <option value="">
                    {!agenceId || Number(agenceId) === 0
                      ? "-- Sélectionner une agence d'abord --"
                      : "-- Sélectionner un véhicule --"}
                  </option>
                  {(vehicules as any[]).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.immatriculation} — {v.marque} {v.modele}
                    </option>
                  ))}
                </select>
              </F>
              <F label="Chauffeur" error={errors.chauffeur_id?.message}>
                <select
                  {...register("chauffeur_id")}
                  className="input"
                  disabled={!agenceId || Number(agenceId) === 0}
                >
                  <option value="">— Sans chauffeur —</option>
                  {(chauffeurs as any[]).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.nom_complet}
                    </option>
                  ))}
                </select>
              </F>
              <F
                label="Axe de livraison"
                error={errors.axe_livraison_id?.message}
              >
                <select {...register("axe_livraison_id")} className="input">
                  <option value="">— Sans axe —</option>
                  {(axes as any[]).map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.nom}
                    </option>
                  ))}
                </select>
              </F>
            </div>
          </div>
        )}

        {/* ── Section Plein ── */}
        <div className="card p-6">
          <h3 className="section-title">Détails du plein</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Date" required error={errors.date?.message}>
              <input
                {...register("date")}
                type="date"
                className="input"
                max={new Date().toISOString().slice(0, 10)}
              />
            </F>
            <F label="Type de carburant" error={errors.type_carburant?.message}>
              <select {...register("type_carburant")} className="input">
                {Object.entries(PRIX_CARBURANT_DEFAUT).map(
                  ([val, { label, prix }]) => (
                    <option key={val} value={val}>
                      {label} — {prix.toLocaleString("fr-FR")} FCFA/
                      {PRIX_CARBURANT_DEFAUT[val].unite}
                    </option>
                  ),
                )}
              </select>
            </F>
            <F
              label="Prix unitaire (FCFA/L)"
              error={errors.prix_unitaire?.message}
              hint="Pré-rempli selon le type · modifiable manuellement"
            >
              <input
                {...register("prix_unitaire")}
                type="number"
                step="1"
                min="0"
                className="input"
                placeholder="ex : 990"
              />
            </F>
            <F label="Litres" required error={errors.litres?.message}>
              <input
                {...register("litres")}
                type="number"
                step="0.1"
                min="0"
                max="500"
                className="input"
                placeholder="ex : 60"
              />
            </F>
            <F
              label="Montant total (FCFA)"
              required
              error={errors.montant?.message}
              hint="Recalculé automatiquement : litres × prix/L"
            >
              <input
                {...register("montant")}
                type="number"
                step="1"
                min="0"
                className="input"
                placeholder="ex : 45 000"
              />
              {litres &&
                prixUnitaire &&
                parseFloat(String(litres)) > 0 &&
                parseFloat(String(prixUnitaire)) > 0 && (
                  <p className="text-xs text-primary-600 mt-1 font-medium">
                    {parseFloat(String(litres)).toLocaleString("fr-FR", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    L ×{" "}
                    {parseFloat(String(prixUnitaire)).toLocaleString("fr-FR")}{" "}
                    FCFA/L ={" "}
                    <strong>
                      {calculerMontant(
                        parseFloat(String(litres)),
                        parseFloat(String(prixUnitaire)),
                      ).toLocaleString("fr-FR")}{" "}
                      FCFA
                    </strong>
                  </p>
                )}
            </F>

            {/* Le prix unitaire est maintenant au-dessus du montant */}

            <F
              label="Kilométrage au compteur"
              error={errors.kilometrage?.message}
              hint="Pré-rempli avec le km actuel du véhicule — vérifiez et ajustez si nécessaire"
            >
              <input
                {...register("kilometrage")}
                type="number"
                min="0"
                className="input"
                placeholder="ex : 85 420"
              />
            </F>
          </div>

          {/* Récap calcul */}
          {litres > 0 && montant > 0 && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-lg flex items-center gap-4 text-sm">
              <div>
                <span className="text-purple-400">Litres : </span>
                <strong className="text-purple-700">
                  {Number(litres).toFixed(1)} L
                </strong>
              </div>
              <div>
                <span className="text-purple-400">Montant : </span>
                <strong className="text-purple-700">
                  {formatCfa(montant)}
                </strong>
              </div>
              {prixUnitaire && (
                <div>
                  <span className="text-purple-400">Prix/L : </span>
                  <strong className="text-purple-700">
                    {formatCfa(Number(prixUnitaire))}
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Section Station & Options ── */}
        <div className="card p-6">
          <h3 className="section-title">Station & Options</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Station service" error={errors.station?.message}>
              <input
                {...register("station")}
                type="text"
                className="input"
                placeholder="ex : Total Mermoz"
              />
            </F>
            <F
              label="N° transaction / bon"
              error={errors.numero_transaction?.message}
            >
              <input
                {...register("numero_transaction")}
                type="text"
                className="input"
                placeholder="ex : TXN-2024-001"
              />
            </F>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <input
              {...register("est_complet")}
              type="checkbox"
              id="est_complet"
              className="w-4 h-4 accent-primary-600"
            />
            <label
              htmlFor="est_complet"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Plein complet{" "}
              <span className="text-gray-400">
                (cochez si le réservoir a été rempli entièrement)
              </span>
            </label>
          </div>

          <div className="mt-4">
            <F label="Notes" error={errors.notes?.message}>
              <textarea
                {...register("notes")}
                rows={2}
                className="input resize-none"
                placeholder="Observations particulières…"
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
            className="btn-primary gap-2"
          >
            {isSubmitting || mutation.isPending ? (
              <>
                <LoadingSpinner size="sm" /> Enregistrement…
              </>
            ) : (
              "⛽ Enregistrer le plein"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
