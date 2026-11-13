import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { communicationsApi } from "@/api/communications.api";
import DataTable, { type Column } from "@/components/shared/DataTable";
import PageHeader from "@/components/shared/PageHeader";
import {
  GraviteCommunicationBadge,
  StatutCommunicationBadge,
} from "@/components/shared/StatutBadge";
import { useAuthStore } from "@/stores/authStore";
import { formatDateTime } from "@/utils";
import {
  Plus,
  Send,
  Archive,
  Trash2,
  Pencil,
  Users,
  Eye,
  Paperclip,
} from "lucide-react";
import type { Communication, TypeCommunication } from "@/types";
import toast from "react-hot-toast";

interface Props {
  type: TypeCommunication;
}

export default function CommunicationListPage({ type }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const peutCreer = hasRole(
    "super_admin",
    "directeur",
    "resp_parc",
    "resp_agence",
  );

  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState("");
  const [search, setSearch] = useState("");

  const titre = type === "note_service" ? "Notes de service" : "Annonces";
  const nouveauLink = `/communication/${type === "note_service" ? "notes-service" : "annonces"}/nouveau?type=${type}`;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["communications", { type, page, statut, search }],
    queryFn: () =>
      communicationsApi
        .list({
          page,
          per_page: 20,
          "filter[type]": type,
          "filter[statut]": statut || undefined,
          "filter[titre]": search || undefined,
        })
        .then((r) => r.data),
  });

  const publierMut = useMutation({
    mutationFn: (id: number) => communicationsApi.publier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communications"] });
      qc.invalidateQueries({ queryKey: ["communications-actives"] });
      toast.success("Publié.");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Erreur lors de la publication.",
      ),
  });

  const archiverMut = useMutation({
    mutationFn: (id: number) => communicationsApi.archiver(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communications"] });
      qc.invalidateQueries({ queryKey: ["communications-actives"] });
      toast.success("Archivé.");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => communicationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communications"] });
      toast.success("Supprimé.");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Erreur lors de la suppression.",
      ),
  });

  const columns: Column<Communication>[] = [
    {
      key: "titre",
      header: "Titre",
      render: (c) => (
        <div>
          <div className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
            {c.titre}
            {c.piece_jointe_url && (
              <Paperclip size={12} className="text-gray-400" />
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {c.auteur?.nom_complet} · {formatDateTime(c.created_at)}
          </div>
        </div>
      ),
    },
    {
      key: "gravite",
      header: "Gravité",
      render: (c) => <GraviteCommunicationBadge gravite={c.gravite} />,
    },
    {
      key: "cibles",
      header: "Cibles",
      render: (c) => (
        <div className="text-xs text-gray-500">
          {c.roles_cibles?.length
            ? `${c.roles_cibles.length} rôle(s)`
            : "Tous rôles"}
          {c.agences_cibles?.length
            ? ` · ${c.agences_cibles.length} agence(s)`
            : " · Toutes agences"}
          {c.accuse_lecture_requis && (
            <div className="text-red-500 font-medium mt-0.5">Accusé requis</div>
          )}
        </div>
      ),
    },
    {
      key: "lectures",
      header: "Lecture",
      render: (c) =>
        c.nb_destinataires != null ? (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users size={12} className="text-gray-400" />
            {c.nb_lectures ?? 0} / {c.nb_destinataires}
          </div>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (c) => <StatutCommunicationBadge statut={c.statut} />,
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div
          className="flex items-center gap-1.5 justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          {c.statut === "brouillon" && (
            <>
              <button
                onClick={() => navigate(`/communication/edit/${c.id}`)}
                title="Modifier"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => publierMut.mutate(c.id)}
                disabled={publierMut.isPending}
                title="Publier"
                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
              >
                <Send size={14} />
              </button>
            </>
          )}
          {c.statut === "publie" && (
            <button
              onClick={() => archiverMut.mutate(c.id)}
              disabled={archiverMut.isPending}
              title="Archiver"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <Archive size={14} />
            </button>
          )}
          <button
            onClick={() => navigate(`/communication/edit/${c.id}`)}
            title="Voir"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Eye size={14} />
          </button>
          {c.statut !== "publie" && (
            <button
              onClick={() => {
                if (confirm(`Supprimer « ${c.titre} » ?`))
                  deleteMut.mutate(c.id);
              }}
              disabled={deleteMut.isPending}
              title="Supprimer"
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={titre}
        subtitle={`${data?.meta?.total ?? 0} message(s)`}
        actions={
          peutCreer && (
            <button
              onClick={() => navigate(nouveauLink)}
              className="btn-primary gap-2"
            >
              <Plus size={16} /> Nouvelle{" "}
              {type === "note_service" ? "note" : "annonce"}
            </button>
          )
        }
      />

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        total={data?.meta?.total}
        page={page}
        perPage={20}
        onPageChange={setPage}
        loading={isLoading}
        error={error ? "Erreur de chargement." : null}
        onRetry={refetch}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/communication/edit/${c.id}`)}
        emptyTitle={`Aucune ${type === "note_service" ? "note de service" : "annonce"}`}
        emptyDescription="Créez votre premier message pour le diffuser aux équipes."
        searchable
        searchPlaceholder="Rechercher par titre…"
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
        filters={
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
            <option value="publie">Publié</option>
            <option value="archive">Archivé</option>
          </select>
        }
      />
    </div>
  );
}
