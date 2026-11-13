import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, TrendingUp, TrendingDown, Edit2, Fuel } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { carburantApi } from "@/api/finance.api";
import { useAuthStore } from "@/stores/authStore";
import { useAgences } from "@/hooks";
import { useQuery as useQ } from "@tanstack/react-query";
import { vehiculesApi } from "@/api/vehicules.api";
import { chauffeursApi } from "@/api/operations.api";
import PageHeader from "@/components/shared/PageHeader";
import { CardLoading, LoadingSpinner } from "@/components/shared/LoadingPage";
import { formatCfa, getMoisLabel } from "@/utils";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────
// Modal — Nouvelle dotation / modification
// ─────────────────────────────────────────────────────────────

function DotationModal({
  dotation, // si présent = édition
  onClose,
}: {
  dotation?: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const annees = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );
  const moisOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const isEdit = !!dotation;

  const [agenceId, setAgenceId] = useState(
    String(dotation?.agence_id ?? user?.agence_id ?? ""),
  );
  const [vehiculeId, setVehiculeId] = useState(
    String(dotation?.vehicule_id ?? ""),
  );
  const [chauffeurId, setChauffeurId] = useState(
    String(dotation?.chauffeur_id ?? ""),
  );
  const [mois, setMois] = useState(dotation?.mois ?? new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(
    dotation?.annee ?? new Date().getFullYear(),
  );
  const [montant, setMontant] = useState(String(dotation?.montant_dote ?? ""));
  const [litres, setLitres] = useState(String(dotation?.litres_dotes ?? ""));
  const [notes, setNotes] = useState(dotation?.notes ?? "");

  const { data: agences = [] } = useAgences();

  const { data: vehicules = [] } = useQ({
    queryKey: ["vehicules-dotation-select", agenceId],
    queryFn: () =>
      vehiculesApi
        .list({
          per_page: 200,
          "filter[agence_id]": agenceId || undefined,
          "filter[statut]": "actif",
        })
        .then((r) => r.data.data as any[]),
    enabled: !!agenceId,
    staleTime: 60_000,
  });

  const { data: chauffeurs = [] } = useQ({
    queryKey: ["chauffeurs-dotation-select", agenceId],
    queryFn: () =>
      chauffeursApi
        .list({
          per_page: 200,
          "filter[agence_id]": agenceId || undefined,
          "filter[statut]": "actif",
        })
        .then((r) => r.data.data as any[]),
    enabled: !!agenceId,
    staleTime: 60_000,
  });

  const mut = useMutation({
    mutationFn: (data: object) =>
      isEdit
        ? carburantApi.updateDotation(dotation.id, data)
        : carburantApi.creerDotation(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dotations"] });
      toast.success(isEdit ? "Dotation mise à jour." : "Dotation enregistrée.");
      onClose();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculeId) {
      toast.error("Véhicule obligatoire.");
      return;
    }
    if (!montant) {
      toast.error("Montant obligatoire.");
      return;
    }
    mut.mutate({
      vehicule_id: parseInt(vehiculeId),
      agence_id: parseInt(agenceId),
      chauffeur_id: chauffeurId ? parseInt(chauffeurId) : null,
      mois,
      annee,
      montant_dote: parseFloat(montant),
      litres_dotes: litres ? parseFloat(litres) : 0,
      notes: notes || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Fuel size={18} />
              {isEdit ? "Modifier la dotation" : "Nouvelle dotation carburant"}
            </h3>
            <p className="text-primary-200 text-xs mt-0.5">
              Attribuer un budget carburant mensuel à un véhicule
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-primary-200 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <form
          id="dotation-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-4"
        >
          {/* Agence */}
          <div>
            <label className="label">Agence *</label>
            <select
              value={agenceId}
              onChange={(e) => {
                setAgenceId(e.target.value);
                setVehiculeId("");
                setChauffeurId("");
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
          </div>

          {/* Véhicule */}
          <div>
            <label className="label">Véhicule *</label>
            <select
              value={vehiculeId}
              onChange={(e) => {
                setChauffeurId("");
                setVehiculeId(e.target.value);
              }}
              className="input"
              disabled={!agenceId}
              required
            >
              <option value="">-- Sélectionner l'agence d'abord --</option>
              {(vehicules as any[]).map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.immatriculation} — {v.marque} {v.modele}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              La dotation est toujours liée à un véhicule.
            </p>
          </div>

          {/* Chauffeur (optionnel) */}
          <div>
            <label className="label">
              Chauffeur
              <span className="text-gray-400 font-normal ml-1">
                (optionnel)
              </span>
            </label>
            <select
              value={chauffeurId}
              onChange={(e) => setChauffeurId(e.target.value)}
              className="input"
              disabled={!agenceId}
            >
              <option value="">— Lié au véhicule uniquement —</option>
              {(chauffeurs as any[]).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.nom_complet}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Associer un chauffeur permet le suivi individuel.
            </p>
          </div>

          {/* Période */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mois *</label>
              <select
                value={mois}
                onChange={(e) => setMois(parseInt(e.target.value))}
                className="input"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {getMoisLabel(m)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Année *</label>
              <select
                value={annee}
                onChange={(e) => setAnnee(parseInt(e.target.value))}
                className="input"
              >
                {annees.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Montant + Litres */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Budget alloué (FCFA) *</label>
              <input
                type="number"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="input"
                min={0}
                step={1000}
                placeholder="500 000"
                required
              />
            </div>
            <div>
              <label className="label">
                Volume alloué (L)
                <span className="text-gray-400 font-normal ml-1">
                  (optionnel)
                </span>
              </label>
              <input
                type="number"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                className="input"
                min={0}
                step={0.5}
                placeholder="ex : 200"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Remarques particulières…"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            ℹ️ Si une dotation existe déjà pour ce véhicule/mois/année, elle
            sera
            <strong> mise à jour</strong> (montant écrasé, litres mis à jour).
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            type="submit"
            form="dotation-form"
            disabled={mut.isPending}
            className="btn-primary gap-2"
          >
            {mut.isPending ? (
              <>
                <LoadingSpinner size="sm" /> Enregistrement…
              </>
            ) : isEdit ? (
              "Mettre à jour"
            ) : (
              "Enregistrer la dotation"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────

export default function CarburantDotationsPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const peutGerer = hasRole("super_admin", "directeur", "resp_parc");

  const annees = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );
  const moisOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [agenceId, setAgenceId] = useState("");
  const [modal, setModal] = useState(false);
  const [editDot, setEditDot] = useState<any>(null);
  const [vue, setVue] = useState<"vehicule" | "synthese">("vehicule");

  const { data: agences = [] } = useAgences();

  const { data: dotations, isLoading } = useQuery({
    queryKey: ["dotations", annee, mois, agenceId],
    queryFn: () =>
      carburantApi
        .dotations({
          annee,
          mois,
          agence_id: agenceId || undefined,
        })
        .then((r) => r.data.data),
  });

  const rows = (dotations ?? []) as any[];

  // Totaux
  const totalDote = rows.reduce((s, d) => s + Number(d.montant_dote ?? 0), 0);
  const totalConsomme = rows.reduce(
    (s, d) => s + Number(d.montant_consomme ?? 0),
    0,
  );
  const totalLitresDotes = rows.reduce(
    (s, d) => s + Number(d.litres_dotes ?? 0),
    0,
  );
  const totalLitresConso = rows.reduce(
    (s, d) => s + Number(d.litres_consommes ?? 0),
    0,
  );
  const totalEcart = totalDote - totalConsomme;
  const nbDepassements = rows.filter(
    (d) => Number(d.taux_consommation) > 100,
  ).length;

  return (
    <div className="space-y-6">
      {/* Modaux */}
      {(modal || editDot) && (
        <DotationModal
          dotation={editDot ?? undefined}
          onClose={() => {
            setModal(false);
            setEditDot(null);
          }}
        />
      )}

      <PageHeader
        title="Dotations carburant"
        subtitle="Suivi budgétaire mensuel par véhicule"
        backTo="/carburant"
        actions={
          <div className="flex gap-2">
            {peutGerer && (
              <button
                onClick={() => {
                  setEditDot(null);
                  setModal(true);
                }}
                className="btn-primary gap-2"
              >
                <Plus size={16} /> Nouvelle dotation
              </button>
            )}
          </div>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-500 font-medium">Période :</span>
        <select
          value={mois}
          onChange={(e) => setMois(parseInt(e.target.value))}
          className="input h-8 py-0 text-sm w-36"
        >
          {moisOptions.map((m) => (
            <option key={m} value={m}>
              {getMoisLabel(m)}
            </option>
          ))}
        </select>
        <select
          value={annee}
          onChange={(e) => setAnnee(parseInt(e.target.value))}
          className="input h-8 py-0 text-sm w-24"
        >
          {annees.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={agenceId}
          onChange={(e) => setAgenceId(e.target.value)}
          className="input h-8 py-0 text-sm w-40"
        >
          <option value="">Toutes agences</option>
          {agences.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.nom}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <CardLoading rows={5} />
      ) : (
        <>
          {/* KPIs */}
          {rows.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Budget alloué",
                  value: formatCfa(totalDote),
                  sub: `${rows.length} véhicule(s)`,
                  color: "text-primary-700",
                  bg: "bg-primary-50 border-primary-200",
                },
                {
                  label: "Consommé",
                  value: formatCfa(totalConsomme),
                  sub: `${totalLitresConso.toFixed(0)} L`,
                  color:
                    totalConsomme > totalDote
                      ? "text-red-600"
                      : "text-gray-800",
                  bg:
                    totalConsomme > totalDote
                      ? "bg-red-50 border-red-200"
                      : "bg-gray-50 border-gray-200",
                },
                {
                  label: totalEcart >= 0 ? "Solde restant" : "Dépassement",
                  value: formatCfa(Math.abs(totalEcart)),
                  sub:
                    totalEcart >= 0 ? "budget non consommé" : "budget dépassé",
                  color: totalEcart >= 0 ? "text-green-600" : "text-red-600",
                  bg:
                    totalEcart >= 0
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200",
                },
                {
                  label: "Dépassements",
                  value: nbDepassements,
                  sub: `sur ${rows.length} véhicule(s)`,
                  color: nbDepassements > 0 ? "text-red-600" : "text-green-600",
                  bg:
                    nbDepassements > 0
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200",
                },
              ].map(({ label, value, sub, color, bg }) => (
                <div
                  key={label}
                  className={`card p-4 text-center border ${bg}`}
                >
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    {label}
                  </dt>
                  <dd className={`text-xl font-bold ${color}`}>{value}</dd>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tableau dotations par véhicule */}
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th>Chauffeur</th>
                  <th className="text-right">Budget (FCFA)</th>
                  <th className="text-right">Consommé</th>
                  <th className="text-right">Litres</th>
                  <th className="text-right">Écart</th>
                  <th>Taux</th>
                  {peutGerer && <th className="w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={peutGerer ? 8 : 7}
                      className="py-12 text-center"
                    >
                      <Fuel size={32} className="mx-auto text-gray-200 mb-2" />
                      <p className="text-gray-400">
                        Aucune dotation pour {getMoisLabel(mois)} {annee}
                      </p>
                      {peutGerer && (
                        <button
                          onClick={() => {
                            setEditDot(null);
                            setModal(true);
                          }}
                          className="btn-primary gap-2 mt-3"
                        >
                          <Plus size={14} /> Créer une dotation
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  rows.map((d: any) => {
                    const taux = Number(d.taux_consommation) || 0;
                    const tL = Number(d.taux_consommation_litres) || 0;
                    const depasse = taux > 100;
                    const ecart = Number(d.ecart) || 0;
                    return (
                      <tr key={d.id} className={depasse ? "bg-red-50" : ""}>
                        {/* Véhicule */}
                        <td>
                          <div
                            className="cursor-pointer hover:text-primary-700 transition-colors"
                            onClick={() =>
                              navigate(`/vehicules/${d.vehicule_id}`)
                            }
                          >
                            <div className="font-mono font-semibold text-primary-700 text-sm">
                              {d.immatriculation}
                            </div>
                            <div className="text-xs text-gray-400">
                              {d.marque_modele}
                            </div>
                          </div>
                        </td>
                        {/* Chauffeur */}
                        <td className="text-sm text-gray-600">
                          {d.chauffeur_nom ?? (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        {/* Budget */}
                        <td className="text-right font-mono text-sm">
                          {formatCfa(d.montant_dote)}
                          {d.litres_dotes > 0 && (
                            <div className="text-xs text-gray-400">
                              {Number(d.litres_dotes).toFixed(0)} L
                            </div>
                          )}
                        </td>
                        {/* Consommé */}
                        <td
                          className={`text-right font-mono text-sm ${depasse ? "text-red-600 font-semibold" : ""}`}
                        >
                          {formatCfa(d.montant_consomme)}
                        </td>
                        {/* Litres */}
                        <td className="text-right font-mono text-sm">
                          {Number(d.litres_consommes).toFixed(1)} L
                          {d.litres_dotes > 0 && (
                            <div
                              className={`text-xs ${tL > 100 ? "text-red-500" : "text-gray-400"}`}
                            >
                              / {Number(d.litres_dotes).toFixed(0)} L
                            </div>
                          )}
                        </td>
                        {/* Écart */}
                        <td
                          className={`text-right font-mono text-sm font-medium ${ecart >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {ecart >= 0 ? (
                              <TrendingDown size={12} />
                            ) : (
                              <TrendingUp size={12} />
                            )}
                            {formatCfa(Math.abs(ecart))}
                          </div>
                        </td>
                        {/* Taux avec barre */}
                        <td className="min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  depasse
                                    ? "bg-red-500"
                                    : taux > 80
                                      ? "bg-yellow-500"
                                      : "bg-success"
                                }`}
                                style={{ width: `${Math.min(taux, 100)}%` }}
                              />
                            </div>
                            <span
                              className={`text-xs font-semibold w-10 text-right ${
                                depasse
                                  ? "text-red-600"
                                  : taux > 80
                                    ? "text-yellow-600"
                                    : "text-green-600"
                              }`}
                            >
                              {taux.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        {/* Actions */}
                        {peutGerer && (
                          <td>
                            <button
                              onClick={() => setEditDot(d)}
                              className="btn-icon text-gray-400 hover:text-primary-600"
                              title="Modifier la dotation"
                            >
                              <Edit2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
