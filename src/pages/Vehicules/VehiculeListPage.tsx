import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Car, Download } from "lucide-react";
import { useVehicules } from "@/hooks";
import DataTable, { type Column } from "@/components/shared/DataTable";
import PageHeader from "@/components/shared/PageHeader";
import {
  StatutDocumentBadge,
  StatutVehiculeBadge,
  TypeVehiculeBadge,
} from "@/components/shared/StatutBadge";
import NewBadge from "@/components/shared/NewBadge";
import { useAuthStore } from "@/stores/authStore";
import { downloadBlob, formatDate, formatKm } from "@/utils";
import type { Vehicule } from "@/types";
import { rapportsApi } from "@/api/finance.api";
import toast from "react-hot-toast";
import PlaqueSN from "@/components/shared/PlaqueSN";

export default function VehiculeListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasRole } = useAuthStore();
  const peutCreer = hasRole(
    "super_admin",
    "directeur",
    "resp_parc",
    "resp_agence",
  );

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("-created_at");

  // Filtres rapides depuis le dashboard (query params)
  const vtProchaine = searchParams.get("filter[vt_prochaine]") === "1";
  const assuranceProchaine =
    searchParams.get("filter[assurance_prochaine]") === "1";
  const entretienEchu = searchParams.get("filter[entretien_echu]") === "1";

  const { data, isLoading, error, refetch } = useVehicules({
    page,
    per_page: 25,
    include: "affectationActive.chauffeur,agence",
    sort,
    ...(search && { "filter[immatriculation]": search }),
    ...(statut && { "filter[statut]": statut }),
    ...(type && { "filter[type_vehicule]": type }),
    // Filtres documentaires — transmis au backend si actifs
    ...(vtProchaine && { "filter[vt_prochaine]": 30 }),
    ...(assuranceProchaine && { "filter[assurance_prochaine]": 30 }),
    ...(entretienEchu && { "filter[entretien_du]": 1 }),
  });

  const columns: Column<Vehicule>[] = [
    {
      key: "immatriculation",
      header: "Véhicule",
      render: (v) => (
        <div className="flex items-center gap-3">
          {/* Miniature photo ou placeholder */}
          <div className="w-12 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
            {v.photo_principale_url ? (
              <img
                src={v.photo_principale_url}
                alt={v.immatriculation}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Si l'image échoue, afficher le placeholder
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    e.currentTarget.remove();
                    parent.innerHTML =
                      "<div class=\"w-full h-full flex items-center justify-center\"><svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#d1d5db' stroke-width='2'><path d='M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3'/><rect x='9' y='11' width='14' height='10' rx='2' ry='2'/><circle cx='13' cy='16' r='1'/></svg></div>";
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car size={16} className="text-gray-300" />
              </div>
            )}
          </div>
          {/* Texte */}
          <div>
            <div className="mb-1">
              <PlaqueSN
                immatriculation={v.immatriculation}
                style={v.style_plaque ?? "nouvelle"}
                ville={v.plaque_ville ?? ""}
                codeVille={v.plaque_code_ville ?? ""}
                size="xs"
              />
            </div>
            <div className="text-xs text-gray-500">
              {v.marque} {v.modele}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "type_vehicule",
      header: "Type",
      render: (v) => <TypeVehiculeBadge type={v.type_vehicule} />,
    },
    {
      key: "statut",
      header: "Statut",
      render: (v) => <StatutVehiculeBadge statut={v.statut} />,
    },
    {
      key: "kilometrage_actuel",
      header: "Kilométrage",
      render: (v) => (
        <span className="font-mono text-sm">
          {formatKm(v.kilometrage_actuel)}
        </span>
      ),
    },
    {
      key: "affectation_active",
      header: "Chauffeur actuel",
      render: (v) =>
        v.affectation_active?.chauffeur ? (
          <span className="text-sm">{v.affectation_active.chauffeur.nom}</span>
        ) : (
          <span className="text-gray-400 text-sm">Non affecté</span>
        ),
    },
    {
      key: "statut_vt",
      header: "Visite technique",
      render: (v) => (
        <StatutDocumentBadge statut={v.statut_vt} jours={v.jours_avant_vt} />
      ),
    },
    {
      key: "statut_assurance",
      header: "Assurance",
      render: (v) => (
        <StatutDocumentBadge
          statut={v.statut_assurance}
          jours={v.jours_avant_assurance}
        />
      ),
    },
    {
      key: "agence",
      header: "Agence",
      render: (v) => (
        <span className="text-sm text-gray-600">{v.agence?.nom ?? "—"}</span>
      ),
    },
  ];

  const handleExcelExport = async () => {
    try {
      const res = await rapportsApi.excelParcGlobal();
      downloadBlob(
        res.data as Blob,
        `parc_vehicules_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success("Export téléchargé.");
    } catch {
      toast.error("Erreur lors de l'export.");
    }
  };

  const filtreBandeauLabel = vtProchaine
    ? "Filtre actif : véhicules avec visite technique dans les 30 prochains jours"
    : assuranceProchaine
      ? "Filtre actif : véhicules avec assurance expirant dans les 30 prochains jours"
      : entretienEchu
        ? "Filtre actif : véhicules dont le kilométrage d'entretien est dépassé"
        : null;

  return (
    <div className="space-y-6">
      {filtreBandeauLabel && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
          <span>⚠ {filtreBandeauLabel}</span>
          <button
            onClick={() => navigate("/vehicules")}
            className="text-xs underline hover:no-underline"
          >
            Voir tous les véhicules
          </button>
        </div>
      )}
      <PageHeader
        title="Véhicules"
        subtitle={`${data?.meta.total ?? 0} véhicule(s) dans le parc`}
        actions={
          <>
            <button onClick={handleExcelExport} className="btn-secondary gap-2">
              <Download size={16} /> Exporter
            </button>
            {peutCreer && (
              <button
                onClick={() => navigate("/vehicules/nouveau")}
                className="btn-primary gap-2"
              >
                <Plus size={16} /> Nouveau véhicule
              </button>
            )}
          </>
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
        error={error ? "Impossible de charger les véhicules." : null}
        onRetry={refetch}
        rowKey={(v) => v.id}
        onRowClick={(v) => navigate(`/vehicules/${v.id}`)}
        searchable
        searchPlaceholder="Rechercher par immatriculation, marque…"
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
        emptyTitle="Aucun véhicule"
        emptyDescription="Commencez par ajouter un véhicule au parc."
        filters={
          <div className="flex flex-wrap gap-2">
            <select
              value={statut}
              onChange={(e) => {
                setStatut(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-40"
            >
              <option value="">Tous statuts</option>
              <option value="actif">Actif</option>
              <option value="en_panne">En panne</option>
              <option value="en_maintenance">En maintenance</option>
              <option value="hors_service">Hors service</option>
            </select>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-40"
            >
              <option value="">Tous types</option>
              <option value="livraison">Livraison</option>
              <option value="administratif">Administratif</option>
              <option value="scooter">Scooter</option>
            </select>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-44"
            >
              <option value="immatriculation">Immatriculation A→Z</option>
              <option value="-immatriculation">Immatriculation Z→A</option>
              <option value="-created_at">Plus récents en premier</option>
              <option value="created_at">Plus anciens en premier</option>
              <option value="marque">Marque A→Z</option>
              <option value="-kilometrage_actuel">Kilométrage ↓</option>
              <option value="date_prochaine_visite_tech">
                VT la plus proche
              </option>
            </select>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Car size={14} />
            {data?.meta.total ?? 0} véhicule(s)
          </div>
        }
      />
    </div>
  );
}
