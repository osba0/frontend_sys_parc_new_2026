import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fournisseursApi } from "@/api/finance.api";
import PageHeader from "@/components/shared/PageHeader";
import { CardLoading } from "@/components/shared/LoadingPage";
import {
  TypeFournisseurBadge,
  StatutMaintenanceBadge,
} from "@/components/shared/StatutBadge";
import NewBadge from "@/components/shared/NewBadge";
import { useAuthStore } from "@/stores/authStore";
import {
  formatDate,
  formatCfa,
  getMoisLabel,
  getTypeOperationLabel,
  mediaUrl,
} from "@/utils";
import {
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Hash,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-gray-600">
        Montant :{" "}
        <span className="font-medium">{formatCfa(payload[0].value)}</span>
      </p>
      <p className="text-gray-600">{payload[0].payload.nb} intervention(s)</p>
    </div>
  );
}

export default function FournisseurDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const peutModifier = hasRole("super_admin", "resp_parc");
  const peutSupprimer = hasRole("super_admin");

  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const annees = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  const { data: fournisseur, isLoading } = useQuery({
    queryKey: ["fournisseur", id],
    queryFn: () => fournisseursApi.get(parseInt(id!)).then((r) => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["fournisseur-stats", id, annee],
    queryFn: () =>
      fournisseursApi.stats(parseInt(id!), { annee }).then((r) => r.data.data),
  });

  const { data: interventions, isLoading: lInterventions } = useQuery({
    queryKey: ["fournisseur-interventions", id, page],
    queryFn: () =>
      fournisseursApi
        .interventions(parseInt(id!), { page, per_page: 10 })
        .then((r) => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: () => fournisseursApi.delete(parseInt(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fournisseurs"] });
      toast.success("Fournisseur supprimé.");
      navigate("/fournisseurs");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Erreur lors de la suppression.",
      ),
  });

  const handleDelete = () => {
    if (confirm(`Supprimer définitivement « ${fournisseur?.nom} » ?`)) {
      deleteMut.mutate();
    }
  };

  if (isLoading || !fournisseur) {
    return (
      <div className="card p-6">
        <CardLoading rows={8} />
      </div>
    );
  }

  const seriesMois = (stats?.par_mois ?? []).map((m) => ({
    mois: getMoisLabel(m.mois).slice(0, 3),
    Total: m.total,
    nb: m.nb,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {fournisseur.nom}
            <NewBadge createdAt={fournisseur.created_at} />
          </span>
        }
        subtitle={fournisseur.specialite ?? undefined}
        backTo="/fournisseurs"
        actions={
          peutModifier || peutSupprimer ? (
            <div className="flex gap-2">
              {peutModifier && (
                <button
                  onClick={() =>
                    navigate(`/fournisseurs/${fournisseur.id}/modifier`)
                  }
                  className="btn-secondary gap-2"
                >
                  <Edit size={16} /> Modifier
                </button>
              )}
              {peutSupprimer && (
                <button
                  onClick={handleDelete}
                  className="btn-danger gap-2"
                  disabled={deleteMut.isPending}
                >
                  <Trash2 size={16} /> Supprimer
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {fournisseur.logo_url ? (
                <img
                  src={mediaUrl(fournisseur.logo_url) ?? undefined}
                  alt={fournisseur.nom}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 size={20} className="text-gray-400" />
              )}
            </div>
            <div>
              <TypeFournisseurBadge type={fournisseur.type} />
              {!fournisseur.est_actif && (
                <span className="badge bg-gray-50 text-gray-400 ml-1.5">
                  Inactif
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2.5 text-sm">
            {fournisseur.telephone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-gray-400" />{" "}
                {fournisseur.telephone}
              </div>
            )}
            {fournisseur.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={14} className="text-gray-400" /> {fournisseur.email}
              </div>
            )}
            {(fournisseur.adresse || fournisseur.ville) && (
              <div className="flex items-start gap-2 text-gray-600">
                <MapPin size={14} className="text-gray-400 mt-0.5" />
                <span>
                  {[fournisseur.adresse, fournisseur.ville]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
            {fournisseur.ninea && (
              <div className="flex items-center gap-2 text-gray-600">
                <Hash size={14} className="text-gray-400" /> NINEA :{" "}
                {fournisseur.ninea}
              </div>
            )}
          </div>

          {fournisseur.notes && (
            <div className="mt-4 pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-600">{fournisseur.notes}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Total dépensé
              </p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCfa(stats?.global.total_all_time ?? 0)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Interventions
              </p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats?.global.nb_all_time ?? 0}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Facture moyenne
              </p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCfa(stats?.global.moyenne_facture ?? 0)}
              </p>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title">Dépenses mensuelles</h3>
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
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={seriesMois}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="section-title mb-3">Historique des interventions</h3>
        {lInterventions ? (
          <CardLoading rows={4} />
        ) : !interventions?.data || interventions.data.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Aucune intervention enregistrée pour ce fournisseur.
          </p>
        ) : (
          <div className="space-y-2">
            {interventions.data.map((i: any) => (
              <div
                key={i.id}
                className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {i.titre}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatDate(i.date_travaux)} ·{" "}
                    {getTypeOperationLabel(i.type_operation)}
                    {i.vehicule && ` · ${i.vehicule.immatriculation}`}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatutMaintenanceBadge statut={i.statut} />
                  <span className="font-semibold text-sm text-gray-900 w-24 text-right">
                    {formatCfa(i.montant_ttc)}
                  </span>
                </div>
              </div>
            ))}

            {interventions.meta && interventions.meta.total > 10 && (
              <div className="flex items-center justify-between pt-2 text-sm">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
                >
                  Précédent
                </button>
                <span className="text-gray-400 text-xs">
                  Page {interventions.meta.current_page} —{" "}
                  {interventions.meta.total} au total
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={
                    !interventions.data || interventions.data.length < 10
                  }
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
