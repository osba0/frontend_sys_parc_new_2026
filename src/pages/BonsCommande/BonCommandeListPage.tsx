import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { bonsCommandeApi, rapportsApi } from "@/api/finance.api";
import { useAgences } from "@/hooks";
import DataTable, { type Column } from "@/components/shared/DataTable";
import PageHeader from "@/components/shared/PageHeader";
import { StatutBCBadge } from "@/components/shared/StatutBadge";
import { formatDate, formatCfa, downloadBlob } from "@/utils";
import { useAuthStore } from "@/stores/authStore";
import type { BonCommande } from "@/types";
import toast from "react-hot-toast";

export default function BonCommandeListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const peutCreer = hasRole(
    "super_admin",
    "directeur",
    "resp_parc",
    "resp_agence",
    "comptable",
  );

  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState("");
  const [agenceId, setAgenceId] = useState("");
  const [recherche, setRecherche] = useState("");
  const [annee, setAnnee] = useState(new Date().getFullYear());

  const { data: agences = [] } = useAgences();
  const annees = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["bons-commande", { page, statut, agenceId, recherche, annee }],
    queryFn: () =>
      bonsCommandeApi
        .list({
          page,
          per_page: 25,
          sort: "-date_commande",
          include: "fournisseur,vehicule,agence",
          "filter[statut]": statut || undefined,
          "filter[agence_id]": agenceId || undefined,
          "filter[numero_bc]": recherche || undefined,
          "filter[annee]": annee || undefined,
        })
        .then((r) => r.data),
  });

  const handleExport = async () => {
    try {
      const res = await rapportsApi.excelBonsCommande({
        annee,
        agence_id: agenceId || undefined,
      });
      downloadBlob(res.data as Blob, `bons_commande_${annee}.xlsx`);
      toast.success("Export téléchargé.");
    } catch {
      toast.error("Erreur export.");
    }
  };

  const columns: Column<BonCommande>[] = [
    {
      key: "numero_bc",
      header: "N° BC",
      render: (b) => (
        <span className="font-mono font-semibold text-primary-700">
          {b.numero_bc}
        </span>
      ),
    },
    {
      key: "date_commande",
      header: "Date",
      render: (b) => formatDate(b.date_commande),
    },
    {
      key: "fournisseur",
      header: "Fournisseur",
      render: (b) => (
        <span className="text-sm">{b.fournisseur?.nom ?? "—"}</span>
      ),
    },
    {
      key: "vehicule",
      header: "Véhicule",
      render: (b) =>
        b.vehicule ? (
          <span className="font-mono text-sm">
            {b.vehicule.immatriculation}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
    {
      key: "montant_ttc",
      header: "Montant TTC",
      render: (b) => (
        <span className="font-semibold text-sm">
          {formatCfa(b.montant_ttc)}
        </span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (b) => <StatutBCBadge statut={b.statut} />,
    },
    {
      key: "agence",
      header: "Agence",
      render: (b) => <span className="text-sm">{b.agence?.nom ?? "—"}</span>,
    },
    {
      key: "date_livraison_prevue",
      header: "Livraison prévue",
      render: (b) =>
        b.date_livraison_prevue ? (
          <span className="text-sm">{formatDate(b.date_livraison_prevue)}</span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bons de commande"
        subtitle={`${data?.meta?.total ?? 0} bon(s)`}
        actions={
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-secondary gap-2">
              <Download size={16} /> Export
            </button>
            {peutCreer && (
              <button
                onClick={() => navigate("/bons-commande/nouveau")}
                className="btn-primary gap-2"
              >
                <Plus size={16} /> Nouveau BC
              </button>
            )}
          </div>
        }
      />

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        total={data?.meta?.total}
        page={page}
        perPage={25}
        onPageChange={setPage}
        loading={isLoading}
        error={error ? "Erreur de chargement." : null}
        onRetry={refetch}
        rowKey={(b) => b.id}
        onRowClick={(b) => navigate(`/bons-commande/${b.id}`)}
        emptyTitle="Aucun bon de commande"
        emptyDescription="Aucun BC enregistré pour ces critères."
        searchable
        searchPlaceholder="N° BC…"
        onSearch={(q) => {
          setRecherche(q);
          setPage(1);
        }}
        filters={
          <div className="flex gap-2">
            <select
              value={annee}
              onChange={(e) => {
                setAnnee(parseInt(e.target.value));
                setPage(1);
              }}
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
              onChange={(e) => {
                setAgenceId(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-40"
            >
              <option value="">Toutes agences</option>
              {agences.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
            <select
              value={statut}
              onChange={(e) => {
                setStatut(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-36"
            >
              <option value="">Tous statuts</option>
              <option value="brouillon">Brouillon</option>
              <option value="soumis">Soumis</option>
              <option value="approuve">Approuvé</option>
              <option value="rejete">Rejeté</option>
              <option value="execute">Exécuté</option>
            </select>
          </div>
        }
      />
    </div>
  );
}
