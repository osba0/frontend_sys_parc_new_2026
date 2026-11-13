import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, BarChart3, AlertCircle } from "lucide-react";
import { useMaintenances, useAgences } from "@/hooks";
import DataTable, { type Column } from "@/components/shared/DataTable";
import PageHeader from "@/components/shared/PageHeader";
import { StatutMaintenanceBadge } from "@/components/shared/StatutBadge";
import { useAuthStore } from "@/stores/authStore";
import {
  downloadBlob,
  formatCfa,
  formatDate,
  getTypeOperationLabel,
} from "@/utils";
import { rapportsApi } from "@/api/finance.api";
import type { Maintenance } from "@/types";
import toast from "react-hot-toast";

export default function MaintenanceListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const peutCreer = hasRole(
    "super_admin",
    "directeur",
    "resp_parc",
    "resp_agence",
  );

  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [statut, setStatut] = useState("");
  const [agenceId, setAgenceId] = useState("");
  const [annee, setAnnee] = useState(new Date().getFullYear());

  const { data: agences = [] } = useAgences();

  const { data, isLoading, error, refetch } = useMaintenances({
    page,
    per_page: 25,
    sort: "-date_travaux",
    include: "vehicule,fournisseur,chauffeur",
    "filter[type_operation]": type || undefined,
    "filter[statut]": statut || undefined,
    "filter[annee]": annee || undefined,
    "filter[agence_id]": agenceId || undefined,
  });

  const handleExcel = async () => {
    try {
      const res = await rapportsApi.excelMaintenance({
        annee,
        agence_id: agenceId || undefined,
      });
      downloadBlob(res.data as Blob, `maintenance_${annee}.xlsx`);
      toast.success("Export téléchargé.");
    } catch {
      toast.error("Erreur lors de l'export.");
    }
  };

  const columns: Column<Maintenance>[] = [
    {
      key: "date_travaux",
      header: "Date",
      render: (m) => (
        <span className="text-sm">{formatDate(m.date_travaux)}</span>
      ),
    },
    {
      key: "vehicule",
      header: "Véhicule",
      render: (m) => (
        <span className="font-mono text-primary-700 font-semibold text-sm">
          {m.vehicule?.immatriculation ?? "—"}
        </span>
      ),
    },
    {
      key: "titre",
      header: "Intervention",
      render: (m) => (
        <div>
          <div className="font-medium text-sm text-gray-900">{m.titre}</div>
          <div className="text-xs text-gray-400">
            {getTypeOperationLabel(m.type_operation)}
            {m.signalement_id && (
              <span className="ml-2 text-orange-500">· Signalement lié</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "fournisseur",
      header: "Fournisseur",
      render: (m) => (
        <span className="text-sm">{m.fournisseur?.nom ?? "—"}</span>
      ),
    },
    {
      key: "montant_ttc",
      header: "Montant TTC",
      render: (m) => (
        <span className="font-medium text-sm">{formatCfa(m.montant_ttc)}</span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (m) => (
        <div className="flex flex-col gap-1">
          <StatutMaintenanceBadge statut={m.statut} />
          {m.necessite_approbation && !m.approuve_par && (
            <span className="badge badge-warning text-xs gap-1">
              <AlertCircle size={10} /> Approbation requise
            </span>
          )}
        </div>
      ),
    },
  ];

  // Années disponibles — dynamique
  const annees = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        subtitle={`${data?.meta.total ?? 0} intervention(s)`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/maintenances/stats")}
              className="btn-secondary gap-2"
            >
              <BarChart3 size={16} /> Stats
            </button>
            <button onClick={handleExcel} className="btn-secondary gap-2">
              <Download size={16} /> Excel
            </button>
            {peutCreer && (
              <button
                onClick={() => navigate("/maintenances/nouvelle")}
                className="btn-primary gap-2"
              >
                <Plus size={16} /> Nouvelle
              </button>
            )}
          </div>
        }
      />

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        total={data?.meta.total}
        page={page}
        perPage={25}
        onPageChange={setPage}
        loading={isLoading}
        error={error ? "Erreur de chargement." : null}
        onRetry={refetch}
        rowKey={(m) => m.id}
        onRowClick={(m) => navigate(`/maintenances/${m.id}`)}
        emptyTitle="Aucune maintenance"
        emptyDescription="Aucune intervention enregistrée pour ces critères."
        filters={
          <div className="flex flex-wrap gap-2">
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
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-44"
            >
              <option value="">Tous types</option>
              <option value="entretien">Entretien</option>
              <option value="reparation">Réparation</option>
              <option value="pneu">Pneumatique</option>
              <option value="carrosserie">Carrosserie</option>
              <option value="equipement">Équipement</option>
              <option value="visite_technique">Visite technique</option>
              <option value="contravention">Contravention</option>
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
              <option value="planifie">Planifié</option>
              <option value="en_cours">En cours</option>
              <option value="termine">Terminé</option>
            </select>
          </div>
        }
      />
    </div>
  );
}
