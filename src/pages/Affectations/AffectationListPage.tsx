import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Car, Clock, ArrowLeftRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { affectationsApi } from "@/api/operations.api";
import DataTable, { type Column } from "@/components/shared/DataTable";
import PageHeader from "@/components/shared/PageHeader";
import { CardLoading } from "@/components/shared/LoadingPage";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatKm } from "@/utils";
import type { Affectation } from "@/types";

export default function AffectationListPage() {
  const navigate = useNavigate();
  const { role, user } = useAuthStore();
  const isChauffeur = role === "chauffeur";
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState(isChauffeur ? "" : "active");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["affectations", { page, statut, isChauffeur }],
    queryFn: () =>
      affectationsApi
        .list({
          page,
          per_page: 25,
          sort: "-date_debut",
          include: "vehicule,chauffeur,axeLivraison",
          "filter[statut]": statut || undefined,
          ...(isChauffeur && user?.chauffeur?.id
            ? { "filter[chauffeur_id]": String(user.chauffeur.id) }
            : {}),
        })
        .then((r) => r.data),
  });

  // ── Vue chauffeur — toutes les affectations actives en banner ──
  const affectationsActives = isChauffeur
    ? (data?.data?.filter((a: Affectation) => a.statut === "active") ?? [])
    : [];

  // ── Colonnes adaptées ─────────────────────────────────────
  const columns: Column<Affectation>[] = [
    {
      key: "vehicule",
      header: "Véhicule",
      render: (a) => (
        <div>
          <span className="font-mono font-semibold text-primary-700 text-sm">
            {a.vehicule?.immatriculation ?? "—"}
          </span>
          <div className="text-xs text-gray-400">
            {a.vehicule?.marque} {a.vehicule?.modele}
          </div>
        </div>
      ),
    },
    // Colonne chauffeur masquée pour le chauffeur (inutile)
    ...(!isChauffeur
      ? [
          {
            key: "chauffeur" as const,
            header: "Chauffeur",
            render: (a: Affectation) => a.chauffeur?.nom ?? a.type_affectation,
          },
        ]
      : []),
    {
      key: "axe_livraison",
      header: "Axe",
      render: (a) => a.axe_livraison?.nom ?? "—",
    },
    {
      key: "date_debut",
      header: "Période",
      render: (a) => (
        <div className="text-sm">
          <div>{formatDate(a.date_debut)}</div>
          <div className="text-gray-400 text-xs">
            {a.date_fin ? `→ ${formatDate(a.date_fin)}` : "→ En cours"}
          </div>
        </div>
      ),
    },
    {
      key: "type_affectation",
      header: "Type",
      render: (a) => (
        <span className="badge badge-gray capitalize">
          {a.type_affectation?.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "km_parcourus",
      header: "Km",
      render: (a) => (
        <div className="text-sm font-mono">
          <div className="text-gray-700">
            {a.km_parcourus != null ? formatKm(a.km_parcourus) : "—"}
          </div>
          <div className="text-xs text-gray-400">
            Départ : {formatKm(a.kilometrage_debut)}
          </div>
        </div>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (a) => (
        <span
          className={`badge ${
            a.statut === "active"
              ? "badge-success"
              : a.statut === "terminee"
                ? "badge-gray"
                : "badge-warning"
          }`}
        >
          {a.statut}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mes affectations"
        subtitle={`${data?.meta?.total ?? 0} affectation(s)`}
        actions={
          // Le chauffeur ne peut pas créer d'affectation
          !isChauffeur ? (
            <button
              onClick={() => navigate("/affectations/nouvelle")}
              className="btn-primary gap-2"
            >
              <Plus size={16} /> Nouvelle affectation
            </button>
          ) : undefined
        }
      />

      {/* ── Affectations actives pour le chauffeur ── */}
      {isChauffeur &&
        (isLoading ? (
          <div className="card p-5">
            <CardLoading rows={2} />
          </div>
        ) : affectationsActives.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <ArrowLeftRight size={15} className="text-green-600" />
              <h3 className="text-sm font-semibold text-gray-700">
                {affectationsActives.length > 1
                  ? `${affectationsActives.length} véhicules affectés actuellement`
                  : "Véhicule affecté actuellement"}
              </h3>
            </div>
            <div
              className={`grid gap-3 ${affectationsActives.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
            >
              {affectationsActives.map((affectation: Affectation) => (
                <div
                  key={affectation.id}
                  className="rounded-2xl border-2 border-success bg-green-50 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-5 py-3 bg-green-100 border-b border-green-200">
                    <span className="badge badge-success">Active</span>
                    <span className="text-xs text-green-600">
                      Depuis {formatDate(affectation.date_debut)}
                      {affectation.duree_jours
                        ? ` · ${affectation.duree_jours} jour(s)`
                        : ""}
                    </span>
                  </div>
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-success rounded-xl flex items-center justify-center flex-shrink-0">
                      <Car size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-bold text-primary-700 font-mono leading-tight">
                        {affectation.vehicule?.immatriculation ?? "—"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {affectation.vehicule?.marque}{" "}
                        {affectation.vehicule?.modele}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs">
                        {affectation.axe_livraison?.nom && (
                          <span className="text-gray-500">
                            🛣 {affectation.axe_livraison.nom}
                          </span>
                        )}
                        <span className="badge badge-gray capitalize">
                          {affectation.type_affectation?.replace(/_/g, " ")}
                        </span>
                        <span className="text-gray-400 font-mono">
                          Km départ : {formatKm(affectation.kilometrage_debut)}
                        </span>
                      </div>
                    </div>
                    {affectation.vehicule_id && (
                      <button
                        onClick={() =>
                          navigate(`/vehicules/${affectation.vehicule_id}`)
                        }
                        className="btn-secondary btn-sm flex-shrink-0 text-xs"
                      >
                        Voir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
              <Car size={22} className="text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-700">
                Aucun véhicule affecté en ce moment
              </p>
              <p className="text-sm text-gray-400">
                Contactez votre responsable de parc pour être affecté à un
                véhicule.
              </p>
            </div>
          </div>
        ))}

      {/* ── Historique ── */}
      <div>
        {isChauffeur && (
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Historique des affectations
            </h3>
          </div>
        )}

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
          rowKey={(a) => a.id}
          emptyTitle="Aucune affectation"
          emptyDescription={
            isChauffeur
              ? "Votre historique d'affectations apparaîtra ici."
              : "Aucune affectation enregistrée."
          }
          filters={
            <select
              value={statut}
              onChange={(e) => {
                setStatut(e.target.value);
                setPage(1);
              }}
              className="input h-8 py-0 text-sm w-36"
            >
              <option value="">Toutes</option>
              <option value="active">Actives</option>
              <option value="terminee">Terminées</option>
            </select>
          }
        />
      </div>
    </div>
  );
}
