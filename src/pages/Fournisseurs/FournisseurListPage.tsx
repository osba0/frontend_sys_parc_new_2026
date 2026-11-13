import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Building2, Phone, Mail, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fournisseursApi } from "@/api/finance.api";
import DataTable, { type Column } from "@/components/shared/DataTable";
import PageHeader from "@/components/shared/PageHeader";
import { TypeFournisseurBadge } from "@/components/shared/StatutBadge";
import NewBadge from "@/components/shared/NewBadge";
import { useAuthStore } from "@/stores/authStore";
import { mediaUrl } from "@/utils";
import type { Fournisseur } from "@/types";

const TYPES_FOURNISSEUR = [
  { value: "garage", label: "Garage" },
  { value: "concessionnaire", label: "Concessionnaire" },
  { value: "pneu", label: "Pneumatiques" },
  { value: "carburant", label: "Carburant" },
  { value: "carrosserie", label: "Carrosserie" },
  { value: "electricite", label: "Électricité" },
];

export default function FournisseurListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const peutCreer = hasRole("super_admin", "resp_parc");

  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [statut, setStatut] = useState("actif"); // actif | inactif | tous
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["fournisseurs", { page, type, statut, search }],
    queryFn: () =>
      fournisseursApi
        .list({
          page,
          per_page: 25,
          "filter[type]": type || undefined,
          "filter[nom]": search || undefined,
          ...(statut !== "tous"
            ? { "filter[est_actif]": statut === "actif" ? 1 : 0 }
            : {}),
        })
        .then((r) => r.data),
  });

  const columns: Column<Fournisseur>[] = [
    {
      key: "nom",
      header: "Fournisseur",
      render: (f) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {f.logo_url ? (
              <img
                src={mediaUrl(f.logo_url) ?? undefined}
                alt={f.nom}
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 size={16} className="text-gray-400" />
            )}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
              {f.nom}
              <NewBadge createdAt={f.created_at} />
            </div>
            {f.specialite && (
              <div className="text-xs text-gray-400">{f.specialite}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (f) => <TypeFournisseurBadge type={f.type} />,
    },
    {
      key: "contact",
      header: "Contact",
      render: (f) => (
        <div className="text-sm space-y-0.5">
          {f.telephone && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Phone size={12} className="text-gray-400" /> {f.telephone}
            </div>
          )}
          {f.email && (
            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
              <Mail size={12} className="text-gray-400" /> {f.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "ville",
      header: "Localisation",
      render: (f) =>
        f.ville ? (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin size={12} className="text-gray-400" /> {f.ville}
          </div>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        ),
    },
    {
      key: "est_actif",
      header: "Statut",
      render: (f) => (
        <span
          className={`badge ${f.est_actif ? "badge-success" : "bg-gray-50 text-gray-400"}`}
        >
          {f.est_actif ? "Actif" : "Inactif"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fournisseurs"
        subtitle={`${data?.meta?.total ?? 0} fournisseur(s)`}
        actions={
          peutCreer && (
            <button
              onClick={() => navigate("/fournisseurs/nouveau")}
              className="btn-primary gap-2"
            >
              <Plus size={16} /> Nouveau fournisseur
            </button>
          )
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
        rowKey={(f) => f.id}
        onRowClick={(f) => navigate(`/fournisseurs/${f.id}`)}
        emptyTitle="Aucun fournisseur"
        emptyDescription="Aucun fournisseur ne correspond à ces critères."
        searchable
        searchPlaceholder="Nom du fournisseur…"
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
        filters={
          <div className="flex flex-wrap gap-2">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-44"
            >
              <option value="">Tous types</option>
              {TYPES_FOURNISSEUR.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={statut}
              onChange={(e) => {
                setStatut(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-32"
            >
              <option value="actif">Actifs</option>
              <option value="inactif">Inactifs</option>
              <option value="tous">Tous</option>
            </select>
          </div>
        }
      />
    </div>
  );
}
