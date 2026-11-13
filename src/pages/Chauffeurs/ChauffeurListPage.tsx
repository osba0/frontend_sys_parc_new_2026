import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useChauffeurs } from "@/hooks";
import { useAgences } from "@/hooks";
import DataTable, { type Column } from "@/components/shared/DataTable";
import { ChauffeurAvatar } from "@/components/shared/ChauffeurAvatar";
import NewBadge from "@/components/shared/NewBadge";
import PageHeader from "@/components/shared/PageHeader";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/utils";
import type { Chauffeur } from "@/types";

// Badge permis — aligné sur statut_permis retourné par ChauffeurResource
function PermisStatutBadge({
  statut,
  jours,
}: {
  statut: string;
  jours: number | null;
}) {
  if (statut === "valide")
    return <span className="badge badge-success">Valide</span>;
  if (statut === "critique")
    return <span className="badge badge-danger">{jours ?? 0}j</span>;
  if (statut === "warning")
    return <span className="badge badge-warning">{jours ?? 0}j</span>;
  if (statut === "expire")
    return <span className="badge badge-danger">Expiré</span>;
  return <span className="badge badge-gray">—</span>;
}

export default function ChauffeurListPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [agenceId, setAgenceId] = useState("");

  const { data: agences = [] } = useAgences();

  const { data, isLoading, error, refetch } = useChauffeurs({
    page,
    per_page: 25,
    sort: "nom",
    include: "agence,affectationActive.vehicule",
    "filter[nom]": search || undefined,
    "filter[statut]": statut || undefined,
    "filter[agence_id]": agenceId || undefined,
  });

  const columns: Column<Chauffeur>[] = [
    {
      key: "nom_complet",
      header: "Chauffeur",
      render: (c) => (
        <div className="flex items-center gap-3">
          <ChauffeurAvatar
            photoUrl={c.photo_profil_url}
            prenom={c.prenom}
            nom={c.nom}
            size="md"
          />
          <div>
            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
              {c.nom_complet}
              <NewBadge createdAt={c.created_at} />
            </div>
            {c.matricule_interne && (
              <div className="text-xs text-gray-400 font-mono">
                {c.matricule_interne}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "telephone",
      header: "Contact",
      render: (c) => (
        <div className="text-sm">
          <div>{c.telephone ?? "—"}</div>
          {c.email && <div className="text-gray-400 text-xs">{c.email}</div>}
        </div>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (c) => (
        <span
          className={`badge ${
            c.statut === "actif"
              ? "badge-success"
              : c.statut === "suspendu"
                ? "badge-warning"
                : c.statut === "conge"
                  ? "badge-info"
                  : "badge-gray"
          }`}
        >
          {c.statut}
        </span>
      ),
    },
    {
      key: "vehicule_actuel",
      header: "Véhicule",
      render: (c) =>
        c.vehicule_actuel ? (
          <div>
            <span className="font-mono text-primary-700 font-semibold text-sm">
              {c.vehicule_actuel.immatriculation}
            </span>
            {c.vehicule_actuel.axe && (
              <div className="text-xs text-gray-400 truncate max-w-[120px]">
                {c.vehicule_actuel.axe}
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
    {
      key: "statut_permis",
      header: "Permis",
      render: (c) => (
        <div className="flex flex-col gap-1">
          <PermisStatutBadge
            statut={c.statut_permis}
            jours={c.jours_avant_expiration_permis}
          />
          <span className="text-xs text-gray-400">
            {formatDate(c.date_expiration_permis)}
          </span>
        </div>
      ),
    },
    {
      key: "agence",
      header: "Agence",
      render: (c) => c.agence?.nom ?? "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chauffeurs"
        subtitle={`${data?.meta?.total ?? 0} chauffeur(s)`}
        actions={
          hasPermission("chauffeur.create") ? (
            <button
              onClick={() => navigate("/chauffeurs/nouveau")}
              className="btn-primary gap-2"
            >
              <Plus size={16} /> Nouveau chauffeur
            </button>
          ) : undefined
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
        error={error ? "Impossible de charger les chauffeurs." : null}
        onRetry={refetch}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/chauffeurs/${c.id}`)}
        searchable
        searchPlaceholder="Rechercher par nom, prénom…"
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
        emptyTitle="Aucun chauffeur"
        emptyDescription="Ajoutez votre premier chauffeur."
        filters={
          <div className="flex flex-wrap gap-2">
            <select
              value={statut}
              onChange={(e) => {
                setStatut(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-36"
            >
              <option value="">Tous statuts</option>
              <option value="actif">Actif</option>
              <option value="suspendu">Suspendu</option>
              <option value="conge">En congé</option>
              <option value="quitte">Quitté</option>
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
          </div>
        }
      />
    </div>
  );
}
