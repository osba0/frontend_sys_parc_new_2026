import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { bonsCommandeApi } from "@/api/finance.api";
import { vehiculesApi } from "@/api/vehicules.api";
import PageHeader from "@/components/shared/PageHeader";
import { CardLoading, LoadingSpinner } from "@/components/shared/LoadingPage";
import { useAgences, useFournisseurs } from "@/hooks";
import { formatCfa } from "@/utils";
import toast from "react-hot-toast";

interface Ligne {
  description: string;
  quantite: string;
  unite: string;
  prix_unitaire: string;
}
const emptyLigne = (): Ligne => ({
  description: "",
  quantite: "1",
  unite: "",
  prix_unitaire: "",
});
const toLigne = (l: any): Ligne => ({
  description: l.description ?? "",
  quantite: String(l.quantite ?? "1"),
  unite: l.unite ?? "",
  prix_unitaire: String(l.prix_unitaire ?? ""),
});

const F = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div>
    <label className="label">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

export default function BonCommandeFormPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { id } = useParams<{ id?: string }>();
  const qc = useQueryClient();
  const isEdit = !!id;

  const { data: agences = [] } = useAgences();
  const { data: fournisseurs = [] } = useFournisseurs({ per_page: 200 });

  const [agenceId, setAgenceId] = useState("");
  const [fournisseurId, setFournisseurId] = useState("");
  const [vehiculeId, setVehiculeId] = useState(sp.get("vehicule_id") ?? "");
  const [dateCommande, setDateCommande] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [dateLivraison, setDateLivraison] = useState("");
  const [tva, setTva] = useState("18");
  const [observations, setObservations] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([emptyLigne()]);

  // Charger les données existantes en mode édition
  const { data: bcExistant, isLoading: loadingBC } = useQuery({
    queryKey: ["bon-commande", parseInt(id!)],
    queryFn: () => bonsCommandeApi.get(parseInt(id!)).then((r) => r.data.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!bcExistant) return;
    setAgenceId(String(bcExistant.agence_id ?? ""));
    setFournisseurId(String(bcExistant.fournisseur_id ?? ""));
    setVehiculeId(String(bcExistant.vehicule_id ?? ""));
    setDateCommande(bcExistant.date_commande ?? "");
    setDateLivraison(bcExistant.date_livraison_prevue ?? "");
    setTva(String(bcExistant.tva ?? "18"));
    setObservations(bcExistant.observations ?? "");
    setLignes((bcExistant.lignes ?? []).map(toLigne));
  }, [bcExistant]);

  // Véhicules filtrés par agence
  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules-bc-select", agenceId],
    queryFn: () =>
      vehiculesApi
        .list({
          per_page: 200,
          "filter[agence_id]": agenceId || undefined,
        })
        .then((r) => r.data.data as any[]),
    enabled: !!agenceId,
    staleTime: 60_000,
  });

  const updateLigne = (i: number, field: keyof Ligne, val: string) =>
    setLignes((prev) => {
      const n = [...prev];
      n[i] = { ...n[i], [field]: val };
      return n;
    });

  const removeLigne = (i: number) =>
    setLignes((prev) => prev.filter((_, j) => j !== i));

  // Calculs temps réel
  const lignesCalc = lignes.map((l) => ({
    ...l,
    total: (parseFloat(l.quantite) || 0) * (parseFloat(l.prix_unitaire) || 0),
  }));
  const totalHt = lignesCalc.reduce((s, l) => s + l.total, 0);
  const tvaPct = parseFloat(tva) || 0;
  const montantTva = (totalHt * tvaPct) / 100;
  const totalTtc = totalHt + montantTva;

  const mutation = useMutation({
    mutationFn: (d: object) =>
      isEdit
        ? bonsCommandeApi.update(parseInt(id!), d)
        : bonsCommandeApi.create(d),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["bons-commande"] });
      qc.invalidateQueries({ queryKey: ["bon-commande", parseInt(id ?? "0")] });
      toast.success(
        isEdit ? "Bon de commande mis à jour." : "Bon de commande créé.",
      );
      navigate(`/bons-commande/${res.data.data.id}`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agenceId) {
      toast.error("Agence obligatoire.");
      return;
    }
    if (lignes.some((l) => !l.description.trim())) {
      toast.error("Toutes les lignes doivent avoir une description.");
      return;
    }
    mutation.mutate({
      agence_id: parseInt(agenceId),
      fournisseur_id: fournisseurId ? parseInt(fournisseurId) : null,
      vehicule_id: vehiculeId ? parseInt(vehiculeId) : null,
      date_commande: dateCommande,
      date_livraison_prevue: dateLivraison || null,
      tva: tvaPct,
      observations: observations || null,
      lignes: lignes.map((l) => ({
        description: l.description,
        quantite: parseFloat(l.quantite) || 1,
        unite: l.unite || null,
        prix_unitaire: parseFloat(l.prix_unitaire) || 0,
      })),
    });
  };

  if (isEdit && loadingBC) {
    return (
      <div className="card p-6">
        <CardLoading rows={6} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={
          isEdit
            ? `Modifier — ${bcExistant?.numero_bc ?? "…"}`
            : "Nouveau bon de commande"
        }
        backTo={isEdit ? `/bons-commande/${id}` : "/bons-commande"}
      />

      {/* Alerte si BC rejeté */}
      {isEdit && bcExistant?.statut === "rejete" && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
          ⚠ Ce BC a été rejeté.
          {bcExistant.motif_rejet && (
            <>
              {" "}
              Motif : <strong>{bcExistant.motif_rejet}</strong>.
            </>
          )}{" "}
          La sauvegarde le repassera en <strong>brouillon</strong>.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations générales */}
        <div className="card p-6">
          <h3 className="section-title">Informations générales</h3>
          <div className="grid grid-cols-2 gap-4">
            <F label="Agence" required>
              <select
                value={agenceId}
                onChange={(e) => {
                  setAgenceId(e.target.value);
                  setVehiculeId("");
                }}
                className="input"
                required
              >
                <option value="">-- Sélectionner --</option>
                {agences.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.nom}
                  </option>
                ))}
              </select>
            </F>

            <F label="Fournisseur">
              <select
                value={fournisseurId}
                onChange={(e) => setFournisseurId(e.target.value)}
                className="input"
              >
                <option value="">-- Sans fournisseur --</option>
                {(fournisseurs as any[]).map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </F>

            <F label="Véhicule concerné">
              <select
                value={vehiculeId}
                onChange={(e) => setVehiculeId(e.target.value)}
                className="input"
                disabled={!agenceId}
              >
                <option value="">-- Sans véhicule --</option>
                {(vehicules as any[]).map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.immatriculation} — {v.marque} {v.modele}
                  </option>
                ))}
              </select>
            </F>

            <F label="Date commande" required>
              <input
                type="date"
                value={dateCommande}
                onChange={(e) => setDateCommande(e.target.value)}
                className="input"
                required
              />
            </F>

            <F label="Date livraison prévue">
              <input
                type="date"
                value={dateLivraison}
                onChange={(e) => setDateLivraison(e.target.value)}
                className="input"
              />
            </F>

            <F label="TVA (%)">
              <input
                type="number"
                value={tva}
                onChange={(e) => setTva(e.target.value)}
                className="input"
                min={0}
                max={100}
                step={0.5}
              />
            </F>
          </div>
        </div>

        {/* Lignes */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0 border-0 pb-0">
              Lignes de commande
              <span className="ml-2 text-gray-400 font-normal">
                ({lignes.length})
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setLignes((p) => [...p, emptyLigne()])}
              className="btn-secondary btn-sm gap-1"
            >
              <Plus size={13} /> Ajouter
            </button>
          </div>

          <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-400 font-medium uppercase tracking-wide">
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Qté</div>
            <div className="col-span-1">Unité</div>
            <div className="col-span-2">P.U. (FCFA)</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-0" />
          </div>

          <div className="space-y-2">
            {lignesCalc.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    value={l.description}
                    onChange={(e) =>
                      updateLigne(i, "description", e.target.value)
                    }
                    className="input text-sm"
                    placeholder="Description…"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={l.quantite}
                    onChange={(e) => updateLigne(i, "quantite", e.target.value)}
                    className="input text-sm"
                    min={0.01}
                    step={0.01}
                  />
                </div>
                <div className="col-span-1">
                  <input
                    value={l.unite}
                    onChange={(e) => updateLigne(i, "unite", e.target.value)}
                    className="input text-sm"
                    placeholder="U"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={l.prix_unitaire}
                    onChange={(e) =>
                      updateLigne(i, "prix_unitaire", e.target.value)
                    }
                    className="input text-sm"
                    min={0}
                    step={100}
                  />
                </div>
                <div className="col-span-1 text-right text-sm font-medium text-gray-700">
                  {l.total > 0 ? l.total.toLocaleString("fr-SN") : "—"}
                </div>
                <div className="col-span-1 flex justify-end">
                  {lignes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLigne(i)}
                      className="btn-icon text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex justify-between w-48">
                <span className="text-gray-500">Total HT :</span>
                <span className="font-medium">{formatCfa(totalHt)}</span>
              </div>
              <div className="flex justify-between w-48">
                <span className="text-gray-500">TVA ({tvaPct}%) :</span>
                <span className="font-medium">{formatCfa(montantTva)}</span>
              </div>
              <div className="flex justify-between w-48 pt-1 border-t border-gray-200">
                <span className="font-bold text-primary-700">Total TTC :</span>
                <span className="font-bold text-primary-700 text-base">
                  {formatCfa(totalTtc)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Observations */}
        <div className="card p-6">
          <h3 className="section-title">Observations</h3>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Instructions particulières, conditions de livraison…"
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
            disabled={mutation.isPending}
            className="btn-primary gap-2"
          >
            {mutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />{" "}
                {isEdit ? "Mise à jour…" : "Création…"}
              </>
            ) : isEdit ? (
              "Enregistrer les modifications"
            ) : (
              "Créer le bon de commande"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
